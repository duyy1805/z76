import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { NumericFormat } from "react-number-format";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import {
    EXPENSE_LABELS,
    PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT,
    PAYMENT_CONTENT_MAX_LENGTH,
    amountToVietnameseText,
    isSameId,
    stripVN,
    validatePaymentContent,
} from "../../utils/phieu-sec";

const PhieuSecFormDialog = memo(function PhieuSecFormDialog({
    open,
    isMobile,
    isNgoaiTe,
    editingPhieu,
    initialForm,
    selectedDonViId,
    donvis,
    currencies,
    canEdit,
    onAddDonVi,
    onEditDonVi,
    onClose,
    onSubmit,
}) {
    const [draft, setDraft] = useState(initialForm);
    const deferredAmount = useDeferredValue(draft.soTien);
    const contentError = validatePaymentContent(draft.noiDung);
    const amountText = amountToVietnameseText(
        deferredAmount,
        isNgoaiTe ? draft.maLoaiTien || "ngoại tệ" : "VND"
    );
    const contentHelperText = contentError ||
        `${String(draft.noiDung || "").trim().length}/${PAYMENT_CONTENT_MAX_LENGTH} ký tự. Không dùng: ${PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT}.`;

    useEffect(() => {
        if (selectedDonViId === null || selectedDonViId === undefined) return;
        setDraft((current) => isSameId(current.donViId, selectedDonViId)
            ? current
            : { ...current, donViId: selectedDonViId });
    }, [selectedDonViId]);

    const selectedActiveDonVi = useMemo(
        () => donvis.find((item) => isSameId(item.id, draft.donViId)),
        [donvis, draft.donViId]
    );
    const inactiveSelectedDonVi = editingPhieu && draft.donViId && !selectedActiveDonVi
        ? {
            id: draft.donViId,
            name: editingPhieu.tenDonVi || `ID: ${draft.donViId}`,
            tenChuyenKhoan: editingPhieu.tenChuyenKhoanHuongThu || editingPhieu.tenDonVi || "",
            stk: editingPhieu.soTaiKhoanHuongThu || "",
            maNganHang: editingPhieu.maNganHangHuongThu || "",
            tenNganHang: editingPhieu.tenNganHangHuongThu || "",
            chiNhanhNganHang: editingPhieu.chiNhanhNganHangHuongThu || "",
        }
        : null;
    const selectedDonVi = selectedActiveDonVi || inactiveSelectedDonVi;
    const setField = (changes) => setDraft((current) => ({ ...current, ...changes }));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle>{editingPhieu ? "Sửa" : "Tạo"} phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField
                        label="Nội dung"
                        fullWidth
                        value={draft.noiDung}
                        onChange={(event) => setField({ noiDung: event.target.value })}
                        error={!!draft.noiDung && !!contentError}
                        helperText={contentHelperText}
                        inputProps={{ maxLength: PAYMENT_CONTENT_MAX_LENGTH }}
                    />
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "minmax(0, 1fr) 48px 48px", sm: "minmax(0, 1fr) 56px 56px" },
                            gap: 1,
                            alignItems: "start",
                        }}
                    >
                        <Autocomplete
                            sx={{ flex: 1 }}
                            options={donvis}
                            value={selectedDonVi || null}
                            onChange={(_, value) => setField({ donViId: value?.id ?? null })}
                            getOptionLabel={(option) => option?.name ?? ""}
                            isOptionEqualToValue={(option, value) => isSameId(option?.id, value?.id)}
                            filterOptions={(options, { inputValue }) => {
                                const query = stripVN((inputValue || "").toLowerCase().trim());
                                if (!query) return options;
                                return options.filter((option) => stripVN(
                                    [option?.name, option?.tenChuyenKhoan, option?.stk, option?.maNganHang, option?.tenNganHang, option?.chiNhanhNganHang]
                                        .filter(Boolean)
                                        .join(" ")
                                        .toLowerCase()
                                ).includes(query));
                            }}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.id} sx={{ display: "block !important", py: 1 }}>
                                    <Typography>{option.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Tên CK: {option.tenChuyenKhoan || "—"}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        STK: {option.stk || "—"} · Mã NH: {option.maNganHang || "—"} · Tên NH: {option.tenNganHang || "—"} · CN: {option.chiNhanhNganHang || "—"}
                                    </Typography>
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Đơn vị hưởng thụ"
                                    placeholder="Gõ tên đơn vị (không dấu)…"
                                />
                            )}
                        />
                        <IconButton
                            onClick={onAddDonVi}
                            color="primary"
                            sx={{
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                        {editingPhieu && (
                            <Tooltip title={canEdit && draft.donViId ? "Sửa thông tin đơn vị hưởng thụ" : "Chỉ sửa được khi phiếu đang nháp"}>
                                <span>
                                    <IconButton
                                        onClick={() => onEditDonVi(draft.donViId)}
                                        color="primary"
                                        disabled={!canEdit || !draft.donViId}
                                        sx={{
                                            width: { xs: 48, sm: 56 },
                                            height: { xs: 48, sm: 56 },
                                            border: "1px solid",
                                            borderColor: "divider",
                                            bgcolor: "background.paper",
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {!editingPhieu && <Box />}
                        <Typography
                            variant="caption"
                            color={inactiveSelectedDonVi ? "error.main" : "text.secondary"}
                            sx={{
                                gridColumn: { xs: "1", sm: "1 / -1" },
                                px: 1.75,
                                mt: -0.25,
                                overflowWrap: "anywhere",
                            }}
                        >
                            {inactiveSelectedDonVi
                                ? "Đơn vị này đã ngưng sử dụng hoặc không tồn tại. Vui lòng chọn đơn vị đang dùng trước khi lưu."
                                : selectedDonVi
                                ? `Tên CK: ${selectedDonVi.tenChuyenKhoan || "—"} · STK: ${selectedDonVi.stk || "—"} · Mã NH: ${selectedDonVi.maNganHang || "—"} · Tên NH: ${selectedDonVi.tenNganHang || "—"} · CN: ${selectedDonVi.chiNhanhNganHang || "—"}`
                                : "Nhập tên, tên chuyển khoản, số tài khoản, mã ngân hàng hoặc chi nhánh để tìm."}
                        </Typography>
                    </Box>

                    {isNgoaiTe ? (
                        <TextField select required label="Loại tiền" value={draft.maLoaiTien} onChange={(event) => setField({ maLoaiTien: event.target.value })}>
                            {currencies.filter((item) => item.MaLoaiTien !== "VND").map((item) => (
                                <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>
                                    {item.MaLoaiTien} - {item.TenLoaiTien}
                                </MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <TextField select required label="Loại chi phí" value={draft.maLoaiChiPhi} onChange={(event) => setField({ maLoaiChiPhi: event.target.value })}>
                            {Object.entries(EXPENSE_LABELS).map(([value, label]) => (
                                <MenuItem key={value} value={value}>{label}</MenuItem>
                            ))}
                        </TextField>
                    )}

                    <NumericFormat
                        customInput={TextField}
                        label={`Số tiền (${isNgoaiTe ? draft.maLoaiTien || "ngoại tệ" : "VND"})`}
                        thousandSeparator="."
                        decimalSeparator=","
                        allowNegative={false}
                        value={draft.soTien}
                        onValueChange={(values) => setField({ soTien: values.floatValue ?? "" })}
                    />
                    {amountText && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
                            Bằng chữ: {amountText}
                        </Typography>
                    )}
                    <TextField
                        label="Ghi chú"
                        value={draft.ghiChu}
                        onChange={(event) => setField({ ghiChu: event.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Đóng</Button>
                <Button variant="contained" onClick={() => onSubmit(draft)}>
                    {editingPhieu ? "Cập nhật nháp" : "Lưu nháp"}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default PhieuSecFormDialog;
