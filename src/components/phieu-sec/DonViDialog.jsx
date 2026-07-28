import { memo, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from "@mui/material";
import BankTransferGuide from "./fields/BankTransferGuide";

const DonViDialog = memo(function DonViDialog({
    open,
    isMobile,
    mode,
    initialFields,
    banks,
    saving,
    onClose,
    onSave,
}) {
    const isEdit = mode === "edit";
    const [draft, setDraft] = useState(initialFields);
    const setField = (field, value) => {
        setDraft((current) => current[field] === value ? current : { ...current, [field]: value });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
            <DialogTitle>{isEdit ? "Sửa đơn vị hưởng thụ" : "Thêm đơn vị hưởng thụ"}</DialogTitle>
            <DialogContent>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} mt={1} alignItems="flex-start">
                    <Stack spacing={2} sx={{ flex: 1, width: "100%", minWidth: 0 }}>
                        <TextField
                            autoFocus
                            label="Tên đơn vị hưởng thụ (tên hoá đơn)"
                            value={draft.name}
                            onChange={(event) => setField("name", event.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Tên chuyển khoản - IPay"
                            value={draft.transferName}
                            onChange={(event) => setField("transferName", event.target.value)}
                            fullWidth
                            required
                            placeholder="Tên dùng ở cột Beneficiary Name khi chuyển tiền"
                            helperText="Xem hướng dẫn lấy tên chuyển khoản ở bên phải."
                        />
                        <TextField
                            label="Số tài khoản (STK)"
                            value={draft.accountNumber}
                            onChange={(event) => setField("accountNumber", event.target.value)}
                            fullWidth
                            required
                        />
                        <Autocomplete
                            options={banks}
                            value={banks.find((bank) => bank.MaNganHang === draft.bankCode) || null}
                            onChange={(_, value) => setField("bankCode", value?.MaNganHang || "")}
                            getOptionLabel={(option) => option ? `${option.MaNganHang} - ${option.TenNganHang}` : ""}
                            isOptionEqualToValue={(option, value) => option.MaNganHang === value.MaNganHang}
                            renderInput={(params) => <TextField {...params} label="Ngân hàng" required placeholder="Chọn mã ngân hàng" />}
                            fullWidth
                        />
                        <TextField
                            label="Chi nhánh ngân hàng (không bắt buộc)"
                            value={draft.branch}
                            onChange={(event) => setField("branch", event.target.value)}
                            fullWidth
                        />
                    </Stack>
                    <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
                        <BankTransferGuide />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Đóng</Button>
                <Button
                    variant="contained"
                    onClick={() => onSave(draft)}
                    disabled={
                        saving ||
                        !draft.name.trim() ||
                        !draft.transferName.trim() ||
                        !draft.accountNumber.trim() ||
                        !banks.some((bank) => bank.MaNganHang === draft.bankCode)
                    }
                >
                    {saving ? "Đang lưu..." : (isEdit ? "Cập nhật" : "Lưu")}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default DonViDialog;
