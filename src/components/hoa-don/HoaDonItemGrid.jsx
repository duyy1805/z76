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
import { calculateLine, emptyInvoiceLine, fmtMoney } from "../../utils/hoa-don";

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
    const inputProps = { size: "small", variant: "standard", fullWidth: true, disabled: readOnly };

    return (
        <Box>
            <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table size="small" sx={{ minWidth: showDefense ? 1320 : 900 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell width={64}>STT</TableCell>
                            <TableCell sx={cellSx}>Mã hàng</TableCell>
                            <TableCell sx={{ minWidth: 260 }}>Tên hàng hóa/Dịch vụ *</TableCell>
                            <TableCell sx={cellSx}>ĐVT</TableCell>
                            <TableCell sx={cellSx} align="right">Số lượng</TableCell>
                            <TableCell sx={cellSx} align="right">Đơn giá</TableCell>
                            <TableCell sx={cellSx} align="right">Thành tiền</TableCell>
                            {showTaxPerLine && <TableCell sx={{ minWidth: 95 }} align="right">% thuế</TableCell>}
                            {showDefense && (
                                <>
                                    <TableCell sx={cellSx} align="right">SL HĐ</TableCell>
                                    <TableCell sx={cellSx} align="right">ĐG HĐ</TableCell>
                                    <TableCell sx={cellSx} align="right">SL kỳ này</TableCell>
                                    <TableCell sx={cellSx} align="right">ĐG kỳ này</TableCell>
                                    <TableCell sx={cellSx} align="right">SL lũy kế</TableCell>
                                    <TableCell sx={cellSx} align="right">ĐG lũy kế</TableCell>
                                </>
                            )}
                            {!readOnly && <TableCell width={54} />}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(lines || []).map((line, index) => {
                            const calc = calculateLine(
                                { ...line, thueSuatGTGT: showTaxPerLine ? line.thueSuatGTGT : thueSuatChung },
                                tyGia
                            );
                            return (
                                <TableRow key={index} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell><TextField {...inputProps} value={line.maHang || ""} onChange={(e) => updateLine(index, { maHang: e.target.value })} /></TableCell>
                                    <TableCell>
                                        <TextField {...inputProps} value={line.tenHangHoaDichVu || ""} onChange={(e) => updateLine(index, { tenHangHoaDichVu: e.target.value })} />
                                    </TableCell>
                                    <TableCell><TextField {...inputProps} value={line.donViTinh || ""} onChange={(e) => updateLine(index, { donViTinh: e.target.value })} /></TableCell>
                                    <TableCell><TextField {...inputProps} type="number" value={line.soLuong ?? ""} onChange={(e) => updateLine(index, { soLuong: e.target.value })} inputProps={{ min: 0, step: "0.0001", style: { textAlign: "right" } }} /></TableCell>
                                    <TableCell><TextField {...inputProps} type="number" value={line.donGia ?? ""} onChange={(e) => updateLine(index, { donGia: e.target.value })} inputProps={{ min: 0, step: "0.0001", style: { textAlign: "right" } }} /></TableCell>
                                    <TableCell align="right"><Typography sx={{ fontWeight: 700 }}>{fmtMoney(calc.thanhTien)}</Typography></TableCell>
                                    {showTaxPerLine && (
                                        <TableCell><TextField {...inputProps} type="number" value={line.thueSuatGTGT ?? 0} onChange={(e) => updateLine(index, { thueSuatGTGT: e.target.value })} inputProps={{ min: 0, max: 100, step: "0.01", style: { textAlign: "right" } }} /></TableCell>
                                    )}
                                    {showDefense && (
                                        <>
                                            {["soLuongHopDong", "donGiaHopDong", "soLuongThucHien", "donGiaThucHien", "soLuongLuyKe", "donGiaLuyKe"].map((field) => (
                                                <TableCell key={field}>
                                                    <TextField {...inputProps} type="number" value={line[field] ?? ""} onChange={(e) => updateLine(index, { [field]: e.target.value })} inputProps={{ min: 0, step: "0.0001", style: { textAlign: "right" } }} />
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
