import { Box, Stack, Typography } from "@mui/material";
import { calculateTotals, fmtMoney } from "../../utils/hoa-don";

export default function HoaDonTotals({ lines, tyGia = 1, currency = "VND" }) {
    const totals = calculateTotals(lines, tyGia);
    const Row = ({ label, value, strong }) => (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography color={strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 800 : 500 }}>
                {label}
            </Typography>
            <Typography sx={{ fontWeight: strong ? 850 : 650 }}>
                {fmtMoney(value)} {currency}
            </Typography>
        </Stack>
    );

    return (
        <Box sx={{ minWidth: { xs: 0, sm: 320 }, ml: "auto" }}>
            <Stack spacing={1}>
                <Row label="Tổng tiền hàng" value={totals.tongTienHang} />
                <Row label="Tiền thuế GTGT" value={totals.tongTienThue} />
                <Row label="Tổng tiền thanh toán" value={totals.tongTienThanhToan} strong />
                {currency !== "VND" && (
                    <Row label="Tổng quy đổi" value={totals.tongQuyDoi} strong />
                )}
            </Stack>
        </Box>
    );
}
