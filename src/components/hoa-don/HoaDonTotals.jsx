import { Box, Stack, TextField, Typography } from "@mui/material";
import { NumericFormat } from "react-number-format";
import { calculateTotals, currencyAmountScale, fmtMoney, INVOICE_NUMBER_FORMAT, totalsWithTaxAdjustment } from "../../utils/hoa-don";
import { amountToVietnameseText } from "../../utils/phieu-sec";

export default function HoaDonTotals({ lines, tyGia = 1, currency = "VND", cheDoThue, thueSuatChung, tienThueDieuChinh = null, onTaxChange }) {
    const automaticTotals = calculateTotals(lines, tyGia, cheDoThue, thueSuatChung, currency);
    const totals = totalsWithTaxAdjustment(automaticTotals, tienThueDieuChinh, currency, tyGia);
    const manuallyAdjusted = tienThueDieuChinh !== null && tienThueDieuChinh !== undefined && tienThueDieuChinh !== "";
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
                {onTaxChange ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>Tiền thuế GTGT</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <NumericFormat
                                customInput={TextField}
                                size="small"
                                value={manuallyAdjusted ? tienThueDieuChinh : automaticTotals.tongTienThue}
                                thousandSeparator=","
                                decimalScale={currency === "VND" ? 0 : INVOICE_NUMBER_FORMAT.storageAmount}
                                allowNegative={false}
                                onValueChange={({ value }) => onTaxChange(value === "" ? null : value)}
                                slotProps={{ htmlInput: { "aria-label": "Tiền thuế GTGT điều chỉnh" } }}
                                sx={{ width: { xs: 155, sm: 215 }, '& input': { textAlign: 'right', fontWeight: 650 } }}
                            />
                            <Typography>{currency}</Typography>
                        </Stack>
                    </Box>
                ) : <Row label="Tiền thuế GTGT" value={totals.tongTienThue} />}
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
