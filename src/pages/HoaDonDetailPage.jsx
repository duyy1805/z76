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
import StatusChip from "../components/StatusChip";
import HoaDonWorkflowActions from "../components/hoa-don/HoaDonWorkflowActions";
import SectionCard from "../components/hoa-don/SectionCard";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { fmtMoney, INVOICE_TYPE_LABELS } from "../utils/hoa-don";

const DetailField = ({ label, value }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 650, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{value || "—"}</Typography>
    </Box>
);

export default function HoaDonDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const auth = useAuth();
    const { user } = auth;
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const [reasonDialog, setReasonDialog] = useState({ open: false, type: "", title: "", label: "", reason: "" });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const load = useCallback(async () => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            setDetail(await hoaDonApi.getHoaDon(id, { userId: user.id, idDonVi: user.idDonVi }));
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
                            <DetailField label="Hình thức thanh toán" value={detail.hinhThucThanhToan} />
                            <DetailField label="Loại tiền / Tỷ giá" value={`${detail.maLoaiTien || "VND"} / ${detail.tyGia || 1}`} />
                            <DetailField label="Ký hiệu dự kiến" value={detail.kyHieuDuKien} />
                            {detail.soHoaDon && <DetailField label="Số hóa đơn đã phát hành" value={`${detail.kyHieuHoaDon} - ${detail.soHoaDon}`} />}
                        </Stack>
                    </SectionCard>
                </Box>

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
