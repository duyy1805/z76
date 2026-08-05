import { Box, Stack, Typography } from "@mui/material";
import { calculateTotals, currencyAmountScale, fmtMoney, INVOICE_NUMBER_FORMAT } from "../../utils/hoa-don";
import { amountToVietnameseText } from "../../utils/phieu-sec";

export default function HoaDonTotals({ lines, tyGia = 1, currency = "VND" }) {
    const totals = calculateTotals(lines, tyGia);
    const totalText = amountToVietnameseText(totals.tongTienThanhToan, currency);
    const Row = ({ label, value, strong, displayCurrency = currency }) => (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 2,
                alignItems: "baseline",
                width: "100%",
            }}
        >
            <Typography color={strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 800 : 500 }}>
                {label}
            </Typography>
            <Typography sx={{ fontWeight: strong ? 850 : 650, textAlign: "right", whiteSpace: "nowrap" }}>
                {fmtMoney(
                    value,
                    displayCurrency === "VND" && currency !== "VND"
                        ? INVOICE_NUMBER_FORMAT.convertedAmount
                        : currencyAmountScale(displayCurrency),
                    displayCurrency
                )} {displayCurrency}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ width: "100%" }}>
            <Stack spacing={1}>
                <Row label="Tổng tiền hàng" value={totals.tongTienHang} />
                <Row label="Tiền thuế GTGT" value={totals.tongTienThue} />
                <Row label="Tổng tiền thanh toán" value={totals.tongTienThanhToan} strong />
                {totalText && (
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        Bằng chữ: {totalText}
                    </Typography>
                )}
                {currency !== "VND" && (
                    <Row label="Tổng quy đổi" value={totals.tongQuyDoi} strong displayCurrency="VND" />
                )}
            </Stack>
        </Box>
    );
}
