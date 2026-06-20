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
import { BufferedTextField } from "./fields/PaymentFields";
import BankTransferGuide from "./fields/BankTransferGuide";

export default function DonViDialog({
    open,
    isMobile,
    mode,
    fields,
    banks,
    saving,
    onFieldChange,
    onClose,
    onSave,
}) {
    const isEdit = mode === "edit";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
            <DialogTitle>{isEdit ? "Sửa đơn vị hưởng thụ" : "Thêm đơn vị hưởng thụ"}</DialogTitle>
            <DialogContent>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} mt={1} alignItems="flex-start">
                    <Stack spacing={2} sx={{ flex: 1, width: "100%", minWidth: 0 }}>
                        <BufferedTextField
                            autoFocus
                            label="Tên đơn vị hưởng thụ (tên hoá đơn)"
                            value={fields.name}
                            onCommit={(value) => onFieldChange("name", value)}
                            fullWidth
                            required
                        />
                        <BufferedTextField
                            label="Tên chuyển khoản - IPay"
                            value={fields.transferName}
                            onCommit={(value) => onFieldChange("transferName", value)}
                            fullWidth
                            required
                            placeholder="Tên dùng ở cột Beneficiary Name khi chuyển tiền"
                            helperText="Xem hướng dẫn lấy tên chuyển khoản ở bên phải."
                        />
                        <BufferedTextField
                            label="Số tài khoản (STK)"
                            value={fields.accountNumber}
                            onCommit={(value) => onFieldChange("accountNumber", value)}
                            fullWidth
                            required
                        />
                        <Autocomplete
                            options={banks}
                            value={banks.find((bank) => bank.MaNganHang === fields.bankCode) || null}
                            onChange={(_, value) => onFieldChange("bankCode", value?.MaNganHang || "")}
                            getOptionLabel={(option) => option ? `${option.MaNganHang} - ${option.TenNganHang}` : ""}
                            isOptionEqualToValue={(option, value) => option.MaNganHang === value.MaNganHang}
                            renderInput={(params) => <TextField {...params} label="Ngân hàng" required placeholder="Chọn mã ngân hàng" />}
                            fullWidth
                        />
                        <BufferedTextField
                            label="Chi nhánh ngân hàng (không bắt buộc)"
                            value={fields.branch}
                            onCommit={(value) => onFieldChange("branch", value)}
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
                    onClick={onSave}
                    disabled={
                        saving ||
                        !fields.name.trim() ||
                        !fields.transferName.trim() ||
                        !fields.accountNumber.trim() ||
                        !banks.some((bank) => bank.MaNganHang === fields.bankCode)
                    }
                >
                    {saving ? "Đang lưu..." : (isEdit ? "Cập nhật" : "Lưu")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
