import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StatusChip from "../components/StatusChip";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    canApproveInvoice,
    canConfirmInvoiceExported,
    canEditInvoice,
    currencyAmountScale,
    fmtMoney,
    hasInvoicePermission,
    INVOICE_TYPE_LABELS,
    issuedInvoiceSymbol,
} from "../utils/hoa-don";
import { currentInvoicePath, safeInvoiceReturnTo, withInvoiceReturnTo } from "../utils/hoa-don-navigation";
import { buildUpdatedImportRows, UPDATED_IMPORT_HEADERS } from "../utils/hoa-don-excel";

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

function safeExcelFileName(value) {
    return String(value || "nhom-import").replace(/[\\/:*?"<>|]+/g, "-").trim() || "nhom-import";
}

function todayDateInputValue() {
    const date = new Date();
    const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export default function HoaDonImportGroupDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { user } = auth;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState(false);
    const [exportingUpdated, setExportingUpdated] = useState(false);
    const [confirmExportOpen, setConfirmExportOpen] = useState(false);
    const [confirmExportInfo, setConfirmExportInfo] = useState({});
    const [confirmingExported, setConfirmingExported] = useState(false);
    const listReturnTo = safeInvoiceReturnTo(
        new URLSearchParams(location.search).get("returnTo"),
        "/hoa-don-dien-tu?tab=groups"
    );
    const groupReturnTo = currentInvoicePath(location);
    const navigateFromGroup = (target) => navigate(withInvoiceReturnTo(target, groupReturnTo));

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

    useEffect(() => {
        if (!location.state?.toast) return;
        setToast({ open: true, ...location.state.toast });
        navigate(groupReturnTo, { replace: true, state: {} });
    }, [groupReturnTo, location.state, navigate]);

    const invoices = useMemo(() => data?.invoices || [], [data?.invoices]);
    const canSubmitGroup = useMemo(() => {
        const isOwner = Number(data?.group?.nguoiTaoId) === Number(user?.id);
        return invoices.some((invoice) => invoice.maTrangThai === "KhoiTao") && (isOwner || hasInvoicePermission(auth, "HD_Admin"));
    }, [auth, data?.group?.nguoiTaoId, invoices, user?.id]);
    const canApproveGroup = useMemo(() => invoices.some((invoice) => canApproveInvoice(invoice, auth)), [auth, invoices]);
    const exportableInvoices = useMemo(() => invoices.filter((invoice) => canConfirmInvoiceExported(invoice, auth)), [auth, invoices]);
    const canDeleteGroup = hasInvoicePermission(auth, "HD_Admin");

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

    const downloadUpdatedExcel = async () => {
        if (!invoices.length) return;
        setExportingUpdated(true);
        try {
            const details = await mapWithConcurrency(invoices, 5, (invoice) => hoaDonApi.getHoaDon(invoice.id, {
                userId: user.id,
                idDonVi: user.idDonVi,
            }));
            const rows = buildUpdatedImportRows(details);
            if (!rows.length) throw new Error("Nhóm không có dòng hàng hóa để xuất Excel.");

            const worksheet = XLSX.utils.json_to_sheet(rows, { header: UPDATED_IMPORT_HEADERS });
            worksheet["!cols"] = UPDATED_IMPORT_HEADERS.map((header) => ({
                wch: Math.min(Math.max(header.length + 2, header.includes("Tên") || header === "Địa chỉ" ? 28 : 14), 42),
            }));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Hóa đơn GTGT");
            XLSX.writeFile(workbook, `${safeExcelFileName(data?.group?.maNhom)}-da-cap-nhat.xlsx`);
            setToast({ open: true, type: "success", msg: `Đã tạo file Excel từ dữ liệu mới nhất của ${details.length} hóa đơn.` });
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Không thể tạo file Excel cập nhật." });
        } finally {
            setExportingUpdated(false);
        }
    };

    const openConfirmExportDialog = () => {
        const today = todayDateInputValue();
        setConfirmExportInfo(Object.fromEntries(exportableInvoices.map((invoice) => [
            invoice.id,
            {
                soHoaDon: invoice.soHoaDon || "",
                kyHieuHoaDon: issuedInvoiceSymbol(invoice),
                ngayPhatHanh: invoice.ngayPhatHanh ? String(invoice.ngayPhatHanh).slice(0, 10) : today,
            },
        ])));
        setConfirmExportOpen(true);
    };

    const setConfirmExportField = (hoaDonId, patch) => {
        setConfirmExportInfo((current) => ({
            ...current,
            [hoaDonId]: { ...(current[hoaDonId] || {}), ...patch },
        }));
    };

    const confirmGroupExported = async () => {
        const missingInfo = exportableInvoices.some((invoice) => {
            const info = confirmExportInfo[invoice.id] || {};
            return !String(info.soHoaDon || "").trim() ||
                !String(info.kyHieuHoaDon || "").trim() ||
                !String(info.ngayPhatHanh || "").trim();
        });
        if (!exportableInvoices.length || missingInfo) {
            setToast({ open: true, type: "warning", msg: "Nhập đủ số hóa đơn, ký hiệu và ngày phát hành cho các hóa đơn sẵn sàng xuất." });
            return;
        }

        setConfirmingExported(true);
        try {
            const results = await Promise.allSettled(exportableInvoices.map((invoice) => {
                const info = confirmExportInfo[invoice.id];
                return hoaDonApi.confirmHoaDonExported(invoice.id, {
                    soHoaDon: String(info.soHoaDon).trim(),
                    kyHieuHoaDon: String(info.kyHieuHoaDon).trim(),
                    ngayPhatHanh: info.ngayPhatHanh,
                }, user);
            }));
            const succeeded = results.filter((item) => item.status === "fulfilled").length;
            const failed = results.length - succeeded;
            setConfirmExportOpen(false);
            setConfirmExportInfo({});
            setToast({
                open: true,
                type: failed ? "warning" : "success",
                msg: failed
                    ? `Đã xác nhận ${succeeded} hóa đơn; ${failed} hóa đơn chưa chuyển được trạng thái.`
                    : `Đã xác nhận ${succeeded} hóa đơn đã xuất; trạng thái nhóm đã được cập nhật.`,
            });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Xác nhận hóa đơn đã xuất thất bại." });
        } finally {
            setConfirmingExported(false);
        }
    };

    const confirmDeleteGroup = async () => {
        setDeletingGroup(true);
        try {
            await hoaDonApi.deleteNhomImport(id, user);
            navigate(listReturnTo, {
                replace: true,
                state: {
                    toast: {
                        type: "success",
                        msg: `Đã xóa nhóm ${data?.group?.maNhom || "import"} và file Excel gốc. Các hóa đơn trong nhóm vẫn được giữ nguyên.`,
                    },
                },
            });
        } catch (error) {
            setConfirmDeleteOpen(false);
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa nhóm import thất bại." });
        } finally {
            setDeletingGroup(false);
        }
    };

    if (loading && !data) {
        return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
    }

    const group = data?.group;
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 1.25 }, minHeight: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
                <Box sx={{ minWidth: 220, flexShrink: 0 }}>
                    <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(listReturnTo)}>Danh sách nhóm import</Button>
                    <Typography variant="h5" sx={{ mt: 0.25 }}>{group?.maNhom || "Nhóm import"}</Typography>
                    <Typography variant="body2" color="text.secondary">{group?.fileName} · {group?.soHoaDon || 0} hóa đơn · {group?.ngayTao ? new Date(group.ngayTao).toLocaleString("vi-VN") : ""}</Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent={{ md: "flex-end" }}>
                    <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={() => { window.location.href = hoaDonApi.getNhomImportFileUrl(id, user); }}>Tải file gốc</Button>
                    <Button size="small" startIcon={<DownloadIcon />} color="secondary" variant="contained" disabled={!invoices.length || exportingUpdated} onClick={downloadUpdatedExcel}>
                        {exportingUpdated ? "Đang tạo Excel..." : "Tải Excel đã cập nhật"}
                    </Button>
                    <Button size="small" startIcon={<SendIcon />} variant="contained" disabled={!canSubmitGroup || running} onClick={() => runBulk("submit")}>Trình phần hợp lệ</Button>
                    <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={!canApproveGroup || running} onClick={() => runBulk("approve")}>Duyệt phần hợp lệ</Button>
                    <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={!exportableInvoices.length || running || confirmingExported} onClick={openConfirmExportDialog}>
                        Xác nhận đã xuất ({exportableInvoices.length})
                    </Button>
                    {canDeleteGroup && (
                        <Button size="small" startIcon={<DeleteOutlineIcon />} color="error" variant="outlined" disabled={running} onClick={() => setConfirmDeleteOpen(true)}>
                            Xóa nhóm
                        </Button>
                    )}
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

            <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1080 }}>
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
                                <TableCell><Chip size="small" color={invoice.isImportIncomplete ? "warning" : "success"} label={invoice.isImportIncomplete ? "Cần bổ sung" : "Đủ thông tin"} /></TableCell>
                                <TableCell align="right">
                                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigateFromGroup(`/hoa-don-dien-tu/${invoice.id}`)}>Xem</Button>
                                    {canEditInvoice(invoice, auth) && <Button size="small" startIcon={<EditIcon />} onClick={() => navigateFromGroup(`/hoa-don-dien-tu/${invoice.id}/edit`)}>Sửa</Button>}
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

            <Dialog open={confirmDeleteOpen} onClose={() => !deletingGroup && setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa nhóm import?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Nhóm {group?.maNhom || "này"} sẽ không còn hiển thị và file Excel gốc sẽ bị xóa thật khỏi Google Drive hoặc vùng lưu trữ local cũ. Các hóa đơn trong nhóm vẫn được giữ nguyên.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deletingGroup}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDeleteGroup} disabled={deletingGroup}>
                        {deletingGroup ? "Đang xóa..." : "Xóa nhóm"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmExportOpen} onClose={() => !confirmingExported && setConfirmExportOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Xác nhận hóa đơn trong nhóm đã xuất?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Nhập thông tin phát hành để chuyển {exportableInvoices.length} hóa đơn từ Sẵn sàng xuất sang Đã xuất.
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 460, overflow: "auto", pr: 0.5 }}>
                        {exportableInvoices.map((invoice) => {
                            const info = confirmExportInfo[invoice.id] || {};
                            return (
                                <Box
                                    key={invoice.id}
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 1.4fr) minmax(170px, .8fr) minmax(190px, .8fr) minmax(190px, .8fr)" },
                                        gap: 1.25,
                                        alignItems: "start",
                                        p: 1.25,
                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700 }}>{invoice.maDangKy}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                            {invoice.tenNguoiMua || "—"}
                                        </Typography>
                                    </Box>
                                    <TextField size="small" required label="Số hóa đơn" value={info.soHoaDon || ""} onChange={(event) => setConfirmExportField(invoice.id, { soHoaDon: event.target.value })} />
                                    <TextField size="small" required label="Ký hiệu" value={info.kyHieuHoaDon || ""} onChange={(event) => setConfirmExportField(invoice.id, { kyHieuHoaDon: event.target.value })} />
                                    <TextField size="small" required type="date" label="Ngày phát hành" value={info.ngayPhatHanh || ""} onChange={(event) => setConfirmExportField(invoice.id, { ngayPhatHanh: event.target.value })} InputLabelProps={{ shrink: true }} />
                                </Box>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmExportOpen(false)} disabled={confirmingExported}>Đóng</Button>
                    <Button color="success" variant="contained" onClick={confirmGroupExported} disabled={confirmingExported || !exportableInvoices.length}>
                        {confirmingExported ? "Đang xác nhận..." : "Xác nhận đã xuất"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
