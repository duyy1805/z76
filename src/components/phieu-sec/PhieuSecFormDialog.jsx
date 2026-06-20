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
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { BufferedTextField, PaymentAmountField, PaymentContentField } from "./fields/PaymentFields";
import { EXPENSE_LABELS, isSameId, stripVN } from "../../utils/phieu-sec";

export default function PhieuSecFormDialog({
    open,
    isMobile,
    isNgoaiTe,
    editingPhieu,
    form,
    donvis,
    currencies,
    canEdit,
    onFormChange,
    onContentCommit,
    onAmountCommit,
    onAddDonVi,
    onEditDonVi,
    onClose,
    onSubmit,
}) {
    const selectedDonVi = donvis.find((item) => isSameId(item.id, form.donViId));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle>{editingPhieu ? "Sửa" : "Tạo"} phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <PaymentContentField value={form.noiDung} onCommit={onContentCommit} />
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
                            onChange={(_, value) => onFormChange({ donViId: value?.id ?? null })}
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
                            <Tooltip title={canEdit && form.donViId ? "Sửa thông tin đơn vị hưởng thụ" : "Chỉ sửa được khi phiếu đang nháp"}>
                                <span>
                                    <IconButton
                                        onClick={onEditDonVi}
                                        color="primary"
                                        disabled={!canEdit || !form.donViId}
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
                            color="text.secondary"
                            sx={{
                                gridColumn: { xs: "1", sm: "1 / -1" },
                                px: 1.75,
                                mt: -0.25,
                                overflowWrap: "anywhere",
                            }}
                        >
                            {selectedDonVi
                                ? `Tên CK: ${selectedDonVi.tenChuyenKhoan || "—"} · STK: ${selectedDonVi.stk || "—"} · Mã NH: ${selectedDonVi.maNganHang || "—"} · Tên NH: ${selectedDonVi.tenNganHang || "—"} · CN: ${selectedDonVi.chiNhanhNganHang || "—"}`
                                : "Nhập tên, tên chuyển khoản, số tài khoản, mã ngân hàng hoặc chi nhánh để tìm."}
                        </Typography>
                    </Box>

                    {isNgoaiTe ? (
                        <TextField select required label="Loại tiền" value={form.maLoaiTien} onChange={(event) => onFormChange({ maLoaiTien: event.target.value })}>
                            {currencies.filter((item) => item.MaLoaiTien !== "VND").map((item) => (
                                <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>
                                    {item.MaLoaiTien} - {item.TenLoaiTien}
                                </MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <TextField select required label="Loại chi phí" value={form.maLoaiChiPhi} onChange={(event) => onFormChange({ maLoaiChiPhi: event.target.value })}>
                            {Object.entries(EXPENSE_LABELS).map(([value, label]) => (
                                <MenuItem key={value} value={value}>{label}</MenuItem>
                            ))}
                        </TextField>
                    )}

                    <PaymentAmountField
                        value={form.soTien}
                        currencyCode={isNgoaiTe ? form.maLoaiTien || "ngoại tệ" : "VND"}
                        onCommit={onAmountCommit}
                    />
                    <BufferedTextField label="Ghi chú" value={form.ghiChu} onCommit={(value) => onFormChange({ ghiChu: value })} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Đóng</Button>
                <Button variant="contained" onClick={onSubmit}>
                    {editingPhieu ? "Cập nhật nháp" : "Lưu nháp"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
