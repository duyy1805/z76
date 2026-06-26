import {
    Box,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { NumericFormat } from "react-number-format";
import { calculateLine, emptyInvoiceLine, fmtMoney } from "../../utils/hoa-don";

function NumericTextField({ value, onChange, inputProps, ...props }) {
    return (
        <NumericFormat
            {...props}
            customInput={TextField}
            thousandSeparator=","
            decimalSeparator="."
            allowNegative={false}
            value={value ?? ""}
            onValueChange={(values) => onChange(values.value)}
            inputProps={{ ...inputProps, inputMode: "decimal" }}
        />
    );
}

function calcAmount(quantity, price) {
    return Number(quantity || 0) * Number(price || 0);
}

export default function HoaDonItemGrid({
    lines,
    setLines,
    maLoaiHoaDon,
    cheDoThue,
    thueSuatChung,
    tyGia,
    readOnly = false,
}) {
    const showTaxPerLine = cheDoThue === "NhieuThueSuat";
    const showDefense = maLoaiHoaDon === "QuocPhong";

    const updateLine = (index, patch) => {
        setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
    };

    const addLine = () => {
        setLines((current) => [...current, emptyInvoiceLine(current.length + 1)]);
    };

    const removeLine = (index) => {
        setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index).map((line, i) => ({ ...line, soDong: i + 1 })));
    };

    const cellSx = { minWidth: 120 };
    const codeCellSx = { minWidth: 90, width: 100 };
    const nameCellSx = { minWidth: 340 };
    const unitCellSx = { minWidth: 80, width: 90 };
    const quantityCellSx = { minWidth: 95, width: 110 };
    const priceCellSx = { minWidth: 155 };
    const moneyCellSx = { minWidth: 170 };
    const inputProps = { size: "small", variant: "standard", fullWidth: true, disabled: readOnly };

    return (
        <Box>
            <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small" sx={{ minWidth: showDefense ? 1760 : 900 }}>
                    <TableHead>
                        {showDefense ? (
                            <>
                                <TableRow>
                                    <TableCell width={64} rowSpan={2}>STT</TableCell>
                                    <TableCell sx={codeCellSx} rowSpan={2}>Mã hàng</TableCell>
                                    <TableCell sx={nameCellSx} rowSpan={2}>Tên hàng hóa/Dịch vụ *</TableCell>
                                    <TableCell sx={unitCellSx} rowSpan={2}>ĐVT</TableCell>
                                    <TableCell align="center" colSpan={3}>Giá trị hợp đồng</TableCell>
                                    <TableCell align="center" colSpan={3}>Thực hiện</TableCell>
                                    <TableCell align="center" colSpan={3}>Lũy kế từ đầu năm</TableCell>
                                    {!readOnly && <TableCell width={54} rowSpan={2} />}
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={quantityCellSx} align="right">Số lượng</TableCell>
                                    <TableCell sx={priceCellSx} align="right">Đơn giá</TableCell>
                                    <TableCell sx={moneyCellSx} align="right">Thành tiền</TableCell>
                                    <TableCell sx={quantityCellSx} align="right">Số lượng</TableCell>
                                    <TableCell sx={priceCellSx} align="right">Đơn giá</TableCell>
                                    <TableCell sx={moneyCellSx} align="right">Thành tiền</TableCell>
                                    <TableCell sx={quantityCellSx} align="right">Số lượng</TableCell>
                                    <TableCell sx={priceCellSx} align="right">Đơn giá</TableCell>
                                    <TableCell sx={moneyCellSx} align="right">Thành tiền</TableCell>
                                </TableRow>
                            </>
                        ) : (
                            <TableRow>
                                <TableCell width={64}>STT</TableCell>
                                <TableCell sx={codeCellSx}>Mã hàng</TableCell>
                                <TableCell sx={nameCellSx}>Tên hàng hóa/Dịch vụ *</TableCell>
                                <TableCell sx={unitCellSx}>ĐVT</TableCell>
                                <TableCell sx={quantityCellSx} align="right">Số lượng</TableCell>
                                <TableCell sx={priceCellSx} align="right">Đơn giá</TableCell>
                                <TableCell sx={moneyCellSx} align="right">Thành tiền</TableCell>
                                {showTaxPerLine && <TableCell sx={{ minWidth: 95 }} align="right">% thuế</TableCell>}
                                {!readOnly && <TableCell width={54} />}
                            </TableRow>
                        )}
                    </TableHead>
                    <TableBody>
                        {(lines || []).map((line, index) => {
                            const calc = calculateLine(
                                { ...line, thueSuatGTGT: showTaxPerLine ? line.thueSuatGTGT : thueSuatChung },
                                tyGia
                            );
                            if (showDefense) {
                                const soLuongThucHien = line.soLuongThucHien || line.soLuong || "";
                                const donGiaThucHien = line.donGiaThucHien || line.donGia || "";
                                return (
                                    <TableRow key={index} hover>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell sx={codeCellSx}><TextField {...inputProps} value={line.maHang || ""} onChange={(e) => updateLine(index, { maHang: e.target.value })} /></TableCell>
                                        <TableCell sx={nameCellSx}>
                                            <TextField {...inputProps} value={line.tenHangHoaDichVu || ""} onChange={(e) => updateLine(index, { tenHangHoaDichVu: e.target.value })} />
                                        </TableCell>
                                        <TableCell sx={unitCellSx}><TextField {...inputProps} value={line.donViTinh || ""} onChange={(e) => updateLine(index, { donViTinh: e.target.value })} /></TableCell>

                                        <TableCell sx={quantityCellSx}><NumericTextField {...inputProps} value={line.soLuongHopDong ?? ""} onChange={(value) => updateLine(index, { soLuongHopDong: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={priceCellSx}><NumericTextField {...inputProps} value={line.donGiaHopDong ?? ""} onChange={(value) => updateLine(index, { donGiaHopDong: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={moneyCellSx} align="right"><Typography sx={{ fontWeight: 700 }}>{fmtMoney(calcAmount(line.soLuongHopDong, line.donGiaHopDong))}</Typography></TableCell>

                                        <TableCell sx={quantityCellSx}><NumericTextField {...inputProps} value={soLuongThucHien} onChange={(value) => updateLine(index, { soLuongThucHien: value, soLuong: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={priceCellSx}><NumericTextField {...inputProps} value={donGiaThucHien} onChange={(value) => updateLine(index, { donGiaThucHien: value, donGia: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={moneyCellSx} align="right"><Typography sx={{ fontWeight: 700 }}>{fmtMoney(calcAmount(soLuongThucHien, donGiaThucHien))}</Typography></TableCell>

                                        <TableCell sx={quantityCellSx}><NumericTextField {...inputProps} value={line.soLuongLuyKe ?? ""} onChange={(value) => updateLine(index, { soLuongLuyKe: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={priceCellSx}><NumericTextField {...inputProps} value={line.donGiaLuyKe ?? ""} onChange={(value) => updateLine(index, { donGiaLuyKe: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                        <TableCell sx={moneyCellSx} align="right"><Typography sx={{ fontWeight: 700 }}>{fmtMoney(calcAmount(line.soLuongLuyKe, line.donGiaLuyKe))}</Typography></TableCell>

                                        {!readOnly && (
                                            <TableCell align="center">
                                                <IconButton size="small" color="error" disabled={lines.length === 1} onClick={() => removeLine(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            }
                            return (
                                <TableRow key={index} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell sx={codeCellSx}><TextField {...inputProps} value={line.maHang || ""} onChange={(e) => updateLine(index, { maHang: e.target.value })} /></TableCell>
                                    <TableCell sx={nameCellSx}>
                                        <TextField {...inputProps} value={line.tenHangHoaDichVu || ""} onChange={(e) => updateLine(index, { tenHangHoaDichVu: e.target.value })} />
                                    </TableCell>
                                    <TableCell sx={unitCellSx}><TextField {...inputProps} value={line.donViTinh || ""} onChange={(e) => updateLine(index, { donViTinh: e.target.value })} /></TableCell>
                                    <TableCell sx={quantityCellSx}><NumericTextField {...inputProps} value={line.soLuong ?? ""} onChange={(value) => updateLine(index, { soLuong: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                    <TableCell sx={priceCellSx}><NumericTextField {...inputProps} value={line.donGia ?? ""} onChange={(value) => updateLine(index, { donGia: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                    <TableCell sx={moneyCellSx} align="right"><Typography sx={{ fontWeight: 700 }}>{fmtMoney(calc.thanhTien)}</Typography></TableCell>
                                    {showTaxPerLine && (
                                        <TableCell><NumericTextField {...inputProps} value={line.thueSuatGTGT ?? ""} onChange={(value) => updateLine(index, { thueSuatGTGT: value })} inputProps={{ style: { textAlign: "right" } }} /></TableCell>
                                    )}
                                    {showDefense && (
                                        <>
                                            {["soLuongHopDong", "donGiaHopDong", "soLuongThucHien", "donGiaThucHien", "soLuongLuyKe", "donGiaLuyKe"].map((field) => (
                                                <TableCell key={field}>
                                                    <NumericTextField {...inputProps} value={line[field] ?? ""} onChange={(value) => updateLine(index, { [field]: value })} inputProps={{ style: { textAlign: "right" } }} />
                                                </TableCell>
                                            ))}
                                        </>
                                    )}
                                    {!readOnly && (
                                        <TableCell align="center">
                                            <IconButton size="small" color="error" disabled={lines.length === 1} onClick={() => removeLine(index)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            {!readOnly && (
                <Button sx={{ mt: 1.25 }} startIcon={<AddIcon />} variant="outlined" onClick={addLine}>
                    Thêm dòng
                </Button>
            )}
        </Box>
    );
}
