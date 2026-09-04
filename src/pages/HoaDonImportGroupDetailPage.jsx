import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StatusChip from "../components/StatusChip";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    canApproveInvoice,
    canEditInvoice,
    currencyAmountScale,
    fmtMoney,
    hasInvoicePermission,
    INVOICE_TYPE_LABELS,
} from "../utils/hoa-don";

export default function HoaDonImportGroupDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const auth = useAuth();
    const { user } = auth;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

    const load = useCallback(async () => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            setData(await hoaDonApi.getNhomImport(id, user));
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được chi tiết nhóm import." });
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        load();
    }, [load]);

    const invoices = useMemo(() => data?.invoices || [], [data?.invoices]);
    const canSubmitGroup = useMemo(() => {
        const isOwner = Number(data?.group?.nguoiTaoId) === Number(user?.id);
        return invoices.some((invoice) => invoice.maTrangThai === "KhoiTao") && (isOwner || hasInvoicePermission(auth, "HD_Admin"));
    }, [auth, data?.group?.nguoiTaoId, invoices, user?.id]);
    const canApproveGroup = useMemo(() => invoices.some((invoice) => canApproveInvoice(invoice, auth)), [auth, invoices]);

    const runBulk = async (action) => {
        setRunning(true);
        setResult(null);
        try {
            const response = action === "submit"
                ? await hoaDonApi.submitNhomImport(id, user)
                : await hoaDonApi.approveNhomImport(id, user);
            setResult(response);
            setToast({
                open: true,
                type: response.processed?.length ? "success" : "warning",
                msg: `Đã xử lý ${response.processed?.length || 0} hóa đơn; bỏ qua ${response.skipped?.length || 0} hóa đơn.`,
            });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Thao tác nhóm thất bại." });
        } finally {
            setRunning(false);
        }
    };

    if (loading && !data) {
        return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
    }

    const group = data?.group;
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/hoa-don-dien-tu", { state: { tab: "groups" } })}>Quay lại</Button>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>{group?.maNhom || "Nhóm import"}</Typography>
                    <Typography color="text.secondary">{group?.fileName} · {group?.soHoaDon || 0} hóa đơn · {group?.ngayTao ? new Date(group.ngayTao).toLocaleString("vi-VN") : ""}</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => { window.location.href = hoaDonApi.getNhomImportFileUrl(id, user); }}>Tải file gốc</Button>
                    <Button startIcon={<SendIcon />} variant="contained" disabled={!canSubmitGroup || running} onClick={() => runBulk("submit")}>Trình phần hợp lệ</Button>
                    <Button startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={!canApproveGroup || running} onClick={() => runBulk("approve")}>Duyệt phần hợp lệ</Button>
                </Stack>
            </Stack>

            {result && (
                <Alert severity={result.skipped?.length ? "warning" : "success"} onClose={() => setResult(null)}>
                    <Typography sx={{ fontWeight: 700 }}>Đã xử lý {result.processed?.length || 0}, bỏ qua {result.skipped?.length || 0} hóa đơn.</Typography>
                    {(result.skipped || []).slice(0, 10).map((item) => (
                        <Typography key={item.hoaDonId} variant="body2">Hóa đơn #{item.hoaDonId}: {item.reason}</Typography>
                    ))}
                </Alert>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">STT file</TableCell>
                            <TableCell>Mã đăng ký</TableCell>
                            <TableCell>Loại hóa đơn</TableCell>
                            <TableCell>Người mua</TableCell>
                            <TableCell>Ngày HĐ</TableCell>
                            <TableCell align="right">Thanh toán</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Hoàn thiện</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invoices.map((invoice) => (
                            <TableRow key={invoice.id} hover>
                                <TableCell align="center">{invoice.soThuTuTrongNhom}</TableCell>
                                <TableCell sx={{ fontWeight: 750 }}>{invoice.maDangKy}</TableCell>
                                <TableCell>{INVOICE_TYPE_LABELS[invoice.maLoaiHoaDon] || invoice.maLoaiHoaDon || "Chưa bổ sung"}</TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 650 }}>{invoice.tenNguoiMua || "Chưa bổ sung"}</Typography>
                                    <Typography variant="caption" color="text.secondary">{invoice.maSoThue || invoice.maDvcqhns || "Chưa có mã định danh"}</Typography>
                                </TableCell>
                                <TableCell>{invoice.ngayHoaDon ? String(invoice.ngayHoaDon).slice(0, 10) : "—"}</TableCell>
                                <TableCell align="right">{fmtMoney(invoice.tongTienThanhToan, currencyAmountScale(invoice.maLoaiTien), invoice.maLoaiTien)} {invoice.maLoaiTien}</TableCell>
                                <TableCell><StatusChip status={invoice.maTrangThai} /></TableCell>
                                <TableCell><Chip size="small" color={invoice.isImportIncomplete ? "warning" : "success"} label={invoice.isImportIncomplete ? "Cần bổ sung" : "Đủ phân loại"} /></TableCell>
                                <TableCell align="right">
                                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/hoa-don-dien-tu/${invoice.id}`)}>Xem</Button>
                                    {canEditInvoice(invoice, auth) && <Button size="small" startIcon={<EditIcon />} onClick={() => navigate(`/hoa-don-dien-tu/${invoice.id}/edit`)}>Sửa</Button>}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!invoices.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>Không có hóa đơn bạn được phép xem trong nhóm này.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((current) => ({ ...current, open: false }))}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
