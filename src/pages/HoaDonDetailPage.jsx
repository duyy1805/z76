import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import { NumericFormat } from "react-number-format";
import StatusChip from "../components/StatusChip";
import HoaDonWorkflowActions from "../components/hoa-don/HoaDonWorkflowActions";
import SectionCard from "../components/hoa-don/SectionCard";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    canApproveInvoice,
    canProcessInvoiceExportInfo,
    fmtMoney,
    INVOICE_TYPE_LABELS,
    isInvoiceExportInfoComplete,
    TAX_MODE_LABELS,
} from "../utils/hoa-don";

const DetailField = ({ label, value }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 650, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{value || "—"}</Typography>
    </Box>
);

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

function initExportInfo(detail) {
    const lines = detail?.chiTiet || [];
    const hasExportInfo = Boolean(detail?.hinhThucThanhToan);
    return {
        hinhThucThanhToan: detail?.hinhThucThanhToan || "Chuyển khoản",
        cheDoThue: detail?.cheDoThue || "MotThueSuat",
        maLoaiTien: detail?.maLoaiTien || "VND",
        tyGia: detail?.tyGia || 1,
        thueSuatChung: hasExportInfo ? lines[0]?.ThueSuatGTGT ?? "" : "",
        chiTiet: lines.map((line) => ({
            soDong: line.SoDong,
            thueSuatGTGT: hasExportInfo ? line.ThueSuatGTGT ?? "" : "",
        })),
    };
}

export default function HoaDonDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const auth = useAuth();
    const { user } = auth;
    const [detail, setDetail] = useState(null);
    const [exportInfo, setExportInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingExportInfo, setSavingExportInfo] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const [reasonDialog, setReasonDialog] = useState({ open: false, type: "", title: "", label: "", reason: "" });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const load = useCallback(async () => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            const data = await hoaDonApi.getHoaDon(id, { userId: user.id, idDonVi: user.idDonVi });
            setDetail(data);
            setExportInfo(initExportInfo(data));
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được chi tiết hóa đơn." });
        } finally {
            setLoading(false);
        }
    }, [id, user?.id, user?.idDonVi]);

    useEffect(() => {
        load();
    }, [load]);

    const runAction = async (label, fn) => {
        try {
            await fn();
            setToast({ open: true, type: "success", msg: `${label} thành công.` });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || `${label} thất bại.` });
        }
    };

    const openReasonDialog = (type) => {
        setReasonDialog({
            open: true,
            type,
            title: type === "return" ? "Trả lại hóa đơn" : "Từ chối hóa đơn",
            label: type === "return" ? "Lý do trả lại" : "Lý do từ chối",
            reason: "",
        });
    };

    const closeReasonDialog = () => {
        setReasonDialog({ open: false, type: "", title: "", label: "", reason: "" });
    };

    const submitReasonDialog = async () => {
        const ghiChu = reasonDialog.reason.trim();
        if (!ghiChu) {
            setToast({ open: true, type: "warning", msg: "Vui lòng nhập lý do." });
            return;
        }
        const isReturn = reasonDialog.type === "return";
        closeReasonDialog();
        await runAction(
            isReturn ? "Trả lại" : "Từ chối",
            () => hoaDonApi.approveHoaDon(detail.id, {
                hanhDong: isReturn ? "TraLai" : "TuChoi",
                user,
                ghiChu,
            })
        );
    };

    const confirmDelete = async () => {
        setConfirmDeleteOpen(false);
        await runAction("Xóa", () => hoaDonApi.deleteHoaDon(detail.id, user));
        navigate("/hoa-don-dien-tu");
    };

    const canEditExportInfo = canProcessInvoiceExportInfo(detail, auth);
    const exportInfoComplete = isInvoiceExportInfoComplete(detail);
    const approveDisabledReason = detail?.maTrangThai === "ChoXuLy_HoaDon" && canApproveInvoice(detail, auth) && !exportInfoComplete
        ? "Cần lưu đủ hình thức thanh toán, chế độ thuế, thuế suất, loại tiền và tỷ giá trước khi duyệt."
        : "";
    const showTaxPerLine = exportInfo?.cheDoThue === "NhieuThueSuat";

    const setExportField = (patch) => setExportInfo((current) => ({ ...current, ...patch }));
    const setExportLineTax = (soDong, value) => {
        setExportInfo((current) => ({
            ...current,
            chiTiet: (current?.chiTiet || []).map((line) => Number(line.soDong) === Number(soDong) ? { ...line, thueSuatGTGT: value } : line),
        }));
    };

    const saveExportInfo = async () => {
        if (!exportInfo?.hinhThucThanhToan) {
            setToast({ open: true, type: "warning", msg: "Chọn hình thức thanh toán." });
            return;
        }
        if (!exportInfo?.maLoaiTien || Number(exportInfo?.tyGia || 0) <= 0) {
            setToast({ open: true, type: "warning", msg: "Nhập loại tiền và tỷ giá hợp lệ." });
            return;
        }
        const chiTiet = (detail.chiTiet || []).map((line) => ({
            soDong: line.SoDong,
            thueSuatGTGT: showTaxPerLine
                ? Number((exportInfo.chiTiet || []).find((item) => Number(item.soDong) === Number(line.SoDong))?.thueSuatGTGT ?? 0)
                : Number(exportInfo.thueSuatChung ?? 0),
        }));

        setSavingExportInfo(true);
        try {
            await hoaDonApi.updateThongTinXuatHoaDon(detail.id, {
                ...exportInfo,
                tyGia: exportInfo.maLoaiTien === "VND" ? 1 : Number(exportInfo.tyGia || 1),
                chiTiet,
                requesterUserId: user?.id,
                requesterIdDonVi: user?.idDonVi,
            });
            setToast({ open: true, type: "success", msg: "Đã lưu thông tin xuất hóa đơn." });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Lưu thông tin xuất hóa đơn thất bại." });
        } finally {
            setSavingExportInfo(false);
        }
    };

    if (loading) return <Typography sx={{ p: 3 }}>Đang tải chi tiết...</Typography>;
    if (!detail) return <Alert severity="warning">Không tìm thấy hóa đơn.</Alert>;

    return (
        <Box sx={{ pr: { md: 0.5 } }}>
            <Stack spacing={2.25}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} spacing={1.5}>
                    <Box>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/hoa-don-dien-tu")} sx={{ mb: 1 }}>Danh sách</Button>
                        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="h5">{detail.maDangKy}</Typography>
                            <StatusChip status={detail.maTrangThai} />
                        </Stack>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {INVOICE_TYPE_LABELS[detail.maLoaiHoaDon] || detail.maLoaiHoaDon} · {detail.tenNguoiMua || "Chưa có người mua"}
                        </Typography>
                    </Box>
                    <HoaDonWorkflowActions
                        invoice={detail}
                        auth={auth}
                        onEdit={() => navigate(`/hoa-don-dien-tu/${detail.id}/edit`)}
                        onSubmit={() => runAction("Trình duyệt", () => hoaDonApi.submitHoaDon(detail.id, user))}
                        onApprove={() => runAction("Duyệt", () => hoaDonApi.approveHoaDon(detail.id, { hanhDong: "Duyet", user }))}
                        onReturn={() => openReasonDialog("return")}
                        onReject={() => openReasonDialog("reject")}
                        onDelete={() => setConfirmDeleteOpen(true)}
                        approveDisabledReason={approveDisabledReason}
                    />
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.2fr .8fr" }, gap: 2 }}>
                    <SectionCard title="Thông tin người mua">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
                            <DetailField label="Tên đơn vị mua hàng" value={detail.tenNguoiMua} />
                            <DetailField label="Mã số thuế" value={detail.maSoThue} />
                            <DetailField label="Địa chỉ" value={detail.diaChi} />
                            <DetailField label="Người mua hàng" value={detail.nguoiLienHe} />
                            <DetailField label="Email" value={detail.email} />
                            <DetailField label="Điện thoại" value={detail.dienThoai} />
                        </Box>
                    </SectionCard>

                    <SectionCard title="Thông tin hóa đơn">
                        <Stack spacing={1.5}>
                            <DetailField label="Ngày hóa đơn" value={detail.ngayHoaDon ? String(detail.ngayHoaDon).slice(0, 10) : ""} />
                            <DetailField label="Ký hiệu dự kiến" value={detail.kyHieuDuKien} />
                            {detail.soHoaDon && <DetailField label="Số hóa đơn đã phát hành" value={`${detail.kyHieuHoaDon} - ${detail.soHoaDon}`} />}
                        </Stack>
                    </SectionCard>
                </Box>

                <SectionCard
                    title="Thông tin xuất hóa đơn"
                    subtitle={exportInfoComplete ? "Thông tin thuế, thanh toán và quy đổi đã được lưu để xuất file import." : "Người phụ trách hóa đơn cần chốt thông tin này trước khi duyệt sẵn sàng xuất."}
                    action={canEditExportInfo && (
                        <Button startIcon={<SaveIcon />} variant="contained" onClick={saveExportInfo} disabled={savingExportInfo}>
                            Lưu thông tin xuất
                        </Button>
                    )}
                >
                    {canEditExportInfo ? (
                        <Stack spacing={2}>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" }, gap: 1.5 }}>
                                <TextField select label="Hình thức thanh toán" value={exportInfo?.hinhThucThanhToan || ""} onChange={(event) => setExportField({ hinhThucThanhToan: event.target.value })}>
                                    <MenuItem value="Chuyển khoản">Chuyển khoản</MenuItem>
                                    <MenuItem value="Tiền mặt">Tiền mặt</MenuItem>
                                </TextField>
                                <TextField select label="Chế độ thuế" value={exportInfo?.cheDoThue || "MotThueSuat"} onChange={(event) => setExportField({ cheDoThue: event.target.value })}>
                                    {Object.entries(TAX_MODE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                                </TextField>
                                {!showTaxPerLine && (
                                    <NumericTextField label="Thuế GTGT (%)" value={exportInfo?.thueSuatChung ?? ""} onChange={(value) => setExportField({ thueSuatChung: value })} />
                                )}
                                <TextField select label="Loại tiền" value={exportInfo?.maLoaiTien || "VND"} onChange={(event) => {
                                    const maLoaiTien = event.target.value;
                                    setExportField({ maLoaiTien, tyGia: maLoaiTien === "VND" ? 1 : exportInfo?.tyGia || 1 });
                                }}>
                                    <MenuItem value="VND">VND</MenuItem>
                                    <MenuItem value="USD">USD</MenuItem>
                                    <MenuItem value="EUR">EUR</MenuItem>
                                </TextField>
                                <NumericTextField label="Tỷ giá" value={exportInfo?.tyGia || ""} disabled={exportInfo?.maLoaiTien === "VND"} onChange={(value) => setExportField({ tyGia: value })} />
                            </Box>

                            {showTaxPerLine && (
                                <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>STT</TableCell>
                                                <TableCell>Tên hàng hóa/Dịch vụ</TableCell>
                                                <TableCell align="right">Thuế GTGT (%)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(detail.chiTiet || []).map((line) => {
                                                const taxLine = (exportInfo?.chiTiet || []).find((item) => Number(item.soDong) === Number(line.SoDong));
                                                return (
                                                    <TableRow key={line.ChiTietId}>
                                                        <TableCell>{line.SoDong}</TableCell>
                                                        <TableCell>{line.TenHangHoaDichVu}</TableCell>
                                                        <TableCell align="right">
                                                            <NumericTextField
                                                                size="small"
                                                                value={taxLine?.thueSuatGTGT ?? ""}
                                                                onChange={(value) => setExportLineTax(line.SoDong, value)}
                                                                inputProps={{ style: { textAlign: "right" } }}
                                                                sx={{ width: 140 }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
                            <DetailField label="Hình thức thanh toán" value={detail.hinhThucThanhToan} />
                            <DetailField label="Chế độ thuế" value={TAX_MODE_LABELS[detail.cheDoThue] || detail.cheDoThue} />
                            <DetailField label="Loại tiền / Tỷ giá" value={detail.maLoaiTien ? `${detail.maLoaiTien} / ${detail.tyGia || 1}` : ""} />
                            <DetailField label="Trạng thái thông tin xuất" value={exportInfoComplete ? "Đã chốt" : "Chưa chốt"} />
                        </Box>
                    )}
                </SectionCard>

                {detail.quocPhong && (
                    <SectionCard title="Thông tin quốc phòng">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                            <DetailField label="Nhà máy" value={detail.quocPhong.NhaMay} />
                            <DetailField label="Bộ phận" value={detail.quocPhong.TenBoPhan} />
                            <DetailField label="Quyết định giao nhiệm vụ" value={detail.quocPhong.QuyetDinhGiaoNhiemVu} />
                            <DetailField label="Hợp đồng" value={detail.quocPhong.SoHopDong} />
                            <DetailField label="Phiếu xuất" value={detail.quocPhong.SoPhieuXuat} />
                            <DetailField label="Phê duyệt giá" value={detail.quocPhong.PheDuyetGia} />
                        </Box>
                    </SectionCard>
                )}

                <SectionCard title="Hàng hóa / Dịch vụ">
                    <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>STT</TableCell>
                                    <TableCell>Mã hàng</TableCell>
                                    <TableCell>Tên hàng hóa/Dịch vụ</TableCell>
                                    <TableCell>ĐVT</TableCell>
                                    <TableCell align="right">Số lượng</TableCell>
                                    <TableCell align="right">Đơn giá</TableCell>
                                    <TableCell align="right">% thuế</TableCell>
                                    <TableCell align="right">Thành tiền</TableCell>
                                    <TableCell align="right">Tiền thuế</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(detail.chiTiet || []).map((line) => (
                                    <TableRow key={line.ChiTietId}>
                                        <TableCell>{line.SoDong}</TableCell>
                                        <TableCell>{line.MaHang || "—"}</TableCell>
                                        <TableCell>{line.TenHangHoaDichVu}</TableCell>
                                        <TableCell>{line.DonViTinh || "—"}</TableCell>
                                        <TableCell align="right">{fmtMoney(line.SoLuong, 2)}</TableCell>
                                        <TableCell align="right">{fmtMoney(line.DonGia)}</TableCell>
                                        <TableCell align="right">{line.ThueSuatGTGT}%</TableCell>
                                        <TableCell align="right">{fmtMoney(line.ThanhTien)}</TableCell>
                                        <TableCell align="right">{fmtMoney(line.TienThueGTGT)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack alignItems="flex-end" spacing={1} sx={{ mt: 2 }}>
                        <Typography>Tổng tiền hàng: <b>{fmtMoney(detail.tongTienHang)} {detail.maLoaiTien}</b></Typography>
                        <Typography>Tiền thuế GTGT: <b>{fmtMoney(detail.tongTienThue)} {detail.maLoaiTien}</b></Typography>
                        <Typography variant="h6">Tổng thanh toán: {fmtMoney(detail.tongTienThanhToan)} {detail.maLoaiTien}</Typography>
                    </Stack>
                </SectionCard>

                <SectionCard title="Lịch sử xử lý">
                    <Stack divider={<Divider flexItem />} spacing={1}>
                        {(detail.lichSuDuyet || []).map((item) => (
                            <Box key={item.PheDuyetId}>
                                <Typography sx={{ fontWeight: 750 }}>{item.HanhDong} · {item.TenNguoiThucHien || item.NguoiThucHienId}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.TuTrangThai} → {item.DenTrangThai} · {item.ThoiDiem}</Typography>
                                {item.GhiChu && <Typography sx={{ mt: 0.5 }}>{item.GhiChu}</Typography>}
                            </Box>
                        ))}
                        {!detail.lichSuDuyet?.length && <Typography color="text.secondary">Chưa có lịch sử duyệt.</Typography>}
                    </Stack>
                </SectionCard>
            </Stack>

            <Snackbar open={toast.open} autoHideDuration={3600} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>

            <Dialog open={reasonDialog.open} onClose={closeReasonDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{reasonDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                        Lý do sẽ được lưu vào lịch sử xử lý để người lập hóa đơn biết cần điều chỉnh gì.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={4}
                        label={reasonDialog.label}
                        value={reasonDialog.reason}
                        onChange={(event) => setReasonDialog((current) => ({ ...current, reason: event.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReasonDialog}>Đóng</Button>
                    <Button
                        variant="contained"
                        color={reasonDialog.type === "return" ? "warning" : "error"}
                        onClick={submitReasonDialog}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa hồ sơ hóa đơn?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Hồ sơ sẽ được xóa mềm và không còn hiển thị trong danh sách làm việc.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDelete}>Xóa hồ sơ</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
