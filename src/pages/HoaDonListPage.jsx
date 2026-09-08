import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Popover,
    Snackbar,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tabs,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import StatusChip from "../components/StatusChip";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { canConfirmInvoiceExported, canDeleteInvoice, canEditInvoice, currencyAmountScale, fmtMoney, INVOICE_STATUS_OPTIONS, INVOICE_TYPE_LABELS, issuedInvoiceSymbol, REVENUE_TYPE_LABELS } from "../utils/hoa-don";
import { currentInvoicePath, readInvoiceListSearch, updateInvoiceListSearch, withInvoiceReturnTo } from "../utils/hoa-don-navigation";
import ImportGroupPanel from "../components/hoa-don/ImportGroupPanel";

function normalizeSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function todayDateInputValue() {
    const date = new Date();
    const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function HeaderFilter({ label, active, width = 280, children, onClear }) {
    const [anchorEl, setAnchorEl] = useState(null);

    return (
        <>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ whiteSpace: "nowrap" }}>
                <span>{label}</span>
                <IconButton
                    size="small"
                    color={active ? "primary" : "default"}
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    aria-label={`Lọc ${label}`}
                >
                    <FilterListRoundedIcon fontSize="inherit" />
                </IconButton>
            </Stack>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{ sx: { p: 1.5, width } }}
            >
                <Stack spacing={1.25}>
                    {children}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {active && (
                            <Button startIcon={<ClearIcon />} size="small" onClick={onClear}>
                                Xóa
                            </Button>
                        )}
                        <Button variant="contained" size="small" onClick={() => setAnchorEl(null)}>
                            OK
                        </Button>
                    </Stack>
                </Stack>
            </Popover>
        </>
    );
}

export default function HoaDonListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const importGroupPanelRef = useRef(null);
    const auth = useAuth();
    const { user } = auth;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [confirmingExported, setConfirmingExported] = useState(false);
    const [confirmExportOpen, setConfirmExportOpen] = useState(false);
    const [confirmExportInfo, setConfirmExportInfo] = useState({});
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deletingInvoice, setDeletingInvoice] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const { activeTab, filters, tableFilters, groupFilters } = useMemo(() => readInvoiceListSearch(searchParams), [searchParams]);
    const listReturnTo = currentInvoicePath(location);
    const showToast = useCallback((type, msg) => setToast({ open: true, type, msg }), []);

    const params = useMemo(() => ({
        userId: user?.id,
        idDonVi: user?.idDonVi,
        tukhoa: filters.tukhoa,
        maTrangThai: filters.maTrangThai,
        maLoaiHoaDon: filters.maLoaiHoaDon,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
    }), [
        user?.id,
        user?.idDonVi,
        filters.tukhoa,
        filters.maTrangThai,
        filters.maLoaiHoaDon,
        filters.dateFrom,
        filters.dateTo,
    ]);

    const load = useCallback(async () => {
        if (!user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            setRows(await hoaDonApi.listHoaDon(params));
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được danh sách hóa đơn." });
        } finally {
            setLoading(false);
        }
    }, [params, user?.id, user?.idDonVi]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (location.state?.toast) {
            setToast({ open: true, ...location.state.toast });
            navigate(currentInvoicePath(location), { replace: true, state: {} });
        }
    }, [location, navigate]);

    const updateListSearch = (patch) => setSearchParams(
        (current) => updateInvoiceListSearch(current, patch),
        { replace: true }
    );
    const setFilter = (patch) => updateListSearch(patch);
    const setTableFilter = (patch) => updateListSearch(patch);
    const navigateFromList = (target) => navigate(withInvoiceReturnTo(target, listReturnTo));

    const filteredRows = useMemo(() => {
        const qMa = normalizeSearch(tableFilters.maDangKy);
        const qNguoiMua = normalizeSearch(tableFilters.nguoiMua);
        const qNguoiTao = normalizeSearch(tableFilters.nguoiTao);
        const amountFrom = Number(tableFilters.amountFrom);
        const amountTo = Number(tableFilters.amountTo);
        const hasAmountFrom = tableFilters.amountFrom !== "" && Number.isFinite(amountFrom);
        const hasAmountTo = tableFilters.amountTo !== "" && Number.isFinite(amountTo);

        return rows.filter((row) => {
            const okMa = !qMa || normalizeSearch([row.maDangKy, row.maNhomImport].filter(Boolean).join(" ")).includes(qMa);
            const okNguoiMua = !qNguoiMua || normalizeSearch([row.tenNguoiMua, row.maSoThue, row.soGiayTo, row.maDvcqhns].filter(Boolean).join(" ")).includes(qNguoiMua);
            const okNguoiTao = !qNguoiTao || normalizeSearch([
                row.tenNguoiDangKy,
                row.nguoiDangKyId,
                row.tenBoPhanNguoiTao,
                row.tenDonVi,
            ].filter(Boolean).join(" ")).includes(qNguoiTao);
            const amount = Number(row.tongTienThanhToan || 0);
            const okAmountFrom = !hasAmountFrom || amount >= amountFrom;
            const okAmountTo = !hasAmountTo || amount <= amountTo;
            return okMa && okNguoiMua && okNguoiTao && okAmountFrom && okAmountTo;
        });
    }, [rows, tableFilters]);

    const exportableRows = filteredRows.filter((row) => canConfirmInvoiceExported(row, auth));
    const exportableIds = exportableRows.map((row) => row.id);
    const selectedExportableIds = selectedIds.filter((id) => exportableIds.includes(id));
    const selectedExportableRows = exportableRows.filter((row) => selectedExportableIds.includes(row.id));
    const allExportableSelected = exportableIds.length > 0 && selectedExportableIds.length === exportableIds.length;
    const someExportableSelected = selectedExportableIds.length > 0 && !allExportableSelected;

    const toggleRow = (id) => {
        setSelectedIds((current) => (
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        ));
    };

    const toggleAllExportable = () => {
        setSelectedIds((current) => {
            if (allExportableSelected) {
                return current.filter((id) => !exportableIds.includes(id));
            }
            return [...new Set([...current, ...exportableIds])];
        });
    };

    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete?.id) return;
        setDeletingInvoice(true);
        try {
            await hoaDonApi.deleteHoaDon(invoiceToDelete.id, user);
            setInvoiceToDelete(null);
            setToast({ open: true, type: "success", msg: "Xóa hóa đơn thành công." });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa hóa đơn thất bại." });
        } finally {
            setDeletingInvoice(false);
        }
    };

    const exportSelected = async () => {
        if (!selectedExportableIds.length) {
            setToast({ open: true, type: "warning", msg: "Chọn ít nhất một hóa đơn ở trạng thái Sẵn sàng xuất." });
            return;
        }

        setExporting(true);
        try {
            const result = await hoaDonApi.createDotXuatFile({
                hoaDonIds: selectedExportableIds,
                requesterUserId: user?.id,
                requesterIdDonVi: user?.idDonVi,
            });
            const dotId = result?.dotXuatFile?.DotXuatFileId;
            if (!dotId) throw new Error("Không lấy được mã đợt xuất file.");

            window.location.href = hoaDonApi.getDotXuatFileExcelUrl(dotId, user);
            setToast({ open: true, type: "success", msg: "Đã tạo file import hóa đơn." });
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Xuất Excel thất bại." });
        } finally {
            setExporting(false);
        }
    };

    const openConfirmExportDialog = () => {
        const today = todayDateInputValue();
        setConfirmExportInfo(Object.fromEntries(selectedExportableRows.map((row) => [
            row.id,
            {
                soHoaDon: row.soHoaDon || "",
                kyHieuHoaDon: issuedInvoiceSymbol(row),
                ngayPhatHanh: row.ngayPhatHanh ? String(row.ngayPhatHanh).slice(0, 10) : today,
            },
        ])));
        setConfirmExportOpen(true);
    };

    const setConfirmExportField = (hoaDonId, patch) => {
        setConfirmExportInfo((current) => ({
            ...current,
            [hoaDonId]: {
                ...(current[hoaDonId] || {}),
                ...patch,
            },
        }));
    };

    const confirmSelectedExported = async () => {
        if (!selectedExportableIds.length) {
            setToast({ open: true, type: "warning", msg: "Chọn ít nhất một hóa đơn ở trạng thái Sẵn sàng xuất." });
            return;
        }
        const missingInfo = selectedExportableRows.some((row) => {
            const info = confirmExportInfo[row.id] || {};
            return !String(info.soHoaDon || "").trim() ||
                !String(info.kyHieuHoaDon || "").trim() ||
                !String(info.ngayPhatHanh || "").trim();
        });
        if (missingInfo) {
            setToast({ open: true, type: "warning", msg: "Nhập đủ số hóa đơn, ký hiệu và ngày phát hành cho các hóa đơn đã chọn." });
            return;
        }

        setConfirmingExported(true);
        try {
            await Promise.all(selectedExportableRows.map((row) => {
                const info = confirmExportInfo[row.id] || {};
                return hoaDonApi.confirmHoaDonExported(row.id, {
                    soHoaDon: String(info.soHoaDon || "").trim(),
                    kyHieuHoaDon: String(info.kyHieuHoaDon || "").trim(),
                    ngayPhatHanh: info.ngayPhatHanh,
                }, user);
            }));
            setSelectedIds((current) => current.filter((id) => !selectedExportableIds.includes(id)));
            setConfirmExportOpen(false);
            setConfirmExportInfo({});
            setToast({ open: true, type: "success", msg: `Đã xác nhận ${selectedExportableIds.length} hóa đơn đã xuất.` });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xác nhận đã xuất thất bại." });
        } finally {
            setConfirmingExported(false);
        }
    };

    return (
        <Box
            sx={{
                height: { xs: "auto", md: "calc(100vh - 112px)" },
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: { xs: "visible", md: "hidden" },
            }}
        >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
                <Box>
                    <Typography variant="h5">Hóa đơn điện tử</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Đăng ký, trình duyệt và theo dõi hồ sơ hóa đơn thanh toán.
                    </Typography>
                </Box>
                {activeTab === 0 && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                        startIcon={<DownloadIcon />}
                        variant="outlined"
                        onClick={exportSelected}
                        disabled={exporting || !selectedExportableIds.length}
                    >
                        Xuất file import ({selectedExportableIds.length})
                    </Button>
                    <Button
                        startIcon={<CheckCircleIcon />}
                        color="success"
                        variant="contained"
                        onClick={openConfirmExportDialog}
                        disabled={confirmingExported || !selectedExportableIds.length}
                    >
                        Xác nhận đã xuất ({selectedExportableIds.length})
                    </Button>
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>Tải lại</Button>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigateFromList("/hoa-don-dien-tu/new")}>Tạo hóa đơn</Button>
                </Stack>}
                {activeTab === 1 && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => importGroupPanelRef.current?.reload()}>Tải lại</Button>
                    <Button startIcon={<FileUploadIcon />} variant="contained" onClick={() => importGroupPanelRef.current?.openImport()}>Import Excel</Button>
                </Stack>}
            </Stack>

            <Paper elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3, px: 1 }}>
                <Tabs value={activeTab} onChange={(event, value) => updateListSearch({ tab: value === 1 ? "groups" : "invoices" })}>
                    <Tab label="Hóa đơn" />
                    <Tab label="Nhóm import" />
                </Tabs>
            </Paper>

            {activeTab === 0 ? <>
            <Paper elevation={0} sx={{ p: 1.5, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr 1fr 1fr 1fr" }, gap: 1.25 }}>
                    <TextField size="small" label="Từ khóa" value={filters.tukhoa} onChange={(e) => setFilter({ tukhoa: e.target.value })} placeholder="Mã đăng ký, người mua, MST, MĐVCQHNS..." />
                    <TextField size="small" select label="Trạng thái" value={filters.maTrangThai} onChange={(e) => setFilter({ maTrangThai: e.target.value })}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {INVOICE_STATUS_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" select label="Loại hóa đơn" value={filters.maLoaiHoaDon} onChange={(e) => setFilter({ maLoaiHoaDon: e.target.value })}>
                        <MenuItem value="">Tất cả</MenuItem>
                        {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="date" label="Từ ngày" value={filters.dateFrom} onChange={(e) => setFilter({ dateFrom: e.target.value })} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="date" label="Đến ngày" value={filters.dateTo} onChange={(e) => setFilter({ dateTo: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Box>
            </Paper>

            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                    overflow: "auto",
                }}
            >
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allExportableSelected}
                                    indeterminate={someExportableSelected}
                                    disabled={!exportableIds.length}
                                    onChange={toggleAllExportable}
                                />
                            </TableCell>
                            <TableCell sx={{ minWidth: 150 }}>
                                <HeaderFilter
                                    label="Mã ĐK / Nhóm"
                                    active={Boolean(tableFilters.maDangKy)}
                                    onClear={() => setTableFilter({ maDangKy: "" })}
                                >
                                    <TextField
                                        autoFocus
                                        size="small"
                                        label="Mã đăng ký hoặc mã nhóm"
                                        placeholder="VD: HD-2026... hoặc NI-2026..."
                                        value={tableFilters.maDangKy}
                                        onChange={(event) => setTableFilter({ maDangKy: event.target.value })}
                                    />
                                </HeaderFilter>
                            </TableCell>
                            <TableCell>Loại</TableCell>
                            <TableCell sx={{ minWidth: 155 }}>Loại hình doanh thu</TableCell>
                            <TableCell sx={{ minWidth: 260 }}>
                                <HeaderFilter
                                    label="Người mua"
                                    active={Boolean(tableFilters.nguoiMua)}
                                    width={320}
                                    onClear={() => setTableFilter({ nguoiMua: "" })}
                                >
                                    <TextField
                                        autoFocus
                                        size="small"
                                        label="Tên người mua / Mã định danh"
                                        placeholder="Nhập tên, MST, MĐVCQHNS hoặc CCCD..."
                                        value={tableFilters.nguoiMua}
                                        onChange={(event) => setTableFilter({ nguoiMua: event.target.value })}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Tìm không dấu, theo tên người mua, MST, MĐVCQHNS hoặc CCCD.
                                    </Typography>
                                </HeaderFilter>
                            </TableCell>
                            <TableCell>Ngày HĐ</TableCell>
                            <TableCell sx={{ minWidth: 135 }}>Thời hạn thanh toán</TableCell>
                            <TableCell align="right" sx={{ minWidth: 190 }}>
                                <HeaderFilter
                                    label="Thanh toán"
                                    active={Boolean(tableFilters.amountFrom || tableFilters.amountTo)}
                                    width={300}
                                    onClear={() => setTableFilter({ amountFrom: "", amountTo: "" })}
                                >
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Từ số tiền"
                                        value={tableFilters.amountFrom}
                                        onChange={(event) => setTableFilter({ amountFrom: event.target.value })}
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Đến số tiền"
                                        value={tableFilters.amountTo}
                                        onChange={(event) => setTableFilter({ amountTo: event.target.value })}
                                    />
                                </HeaderFilter>
                            </TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>
                                <HeaderFilter
                                    label="Người tạo"
                                    active={Boolean(tableFilters.nguoiTao)}
                                    onClear={() => setTableFilter({ nguoiTao: "" })}
                                >
                                    <TextField
                                        autoFocus
                                        size="small"
                                        label="Người tạo"
                                        placeholder="Tên, ID hoặc bộ phận..."
                                        value={tableFilters.nguoiTao}
                                        onChange={(event) => setTableFilter({ nguoiTao: event.target.value })}
                                    />
                                </HeaderFilter>
                            </TableCell>
                            <TableCell sx={{ minWidth: 190 }}>Bộ phận người tạo</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={selectedIds.includes(row.id)}
                                        disabled={!canConfirmInvoiceExported(row, auth)}
                                        onChange={() => toggleRow(row.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 750 }}>{row.maDangKy}</Typography>
                                    {row.maNhomImport && (
                                        <Button size="small" sx={{ minWidth: 0, p: 0, fontSize: 11 }} onClick={() => navigateFromList(`/hoa-don-dien-tu/nhom-import/${row.nhomImportId}`)}>
                                            {row.maNhomImport}
                                        </Button>
                                    )}
                                </TableCell>
                                <TableCell>{INVOICE_TYPE_LABELS[row.maLoaiHoaDon] || row.maLoaiHoaDon}</TableCell>
                                <TableCell>{REVENUE_TYPE_LABELS[row.loaiHinhDoanhThu] || row.loaiHinhDoanhThu || "—"}</TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 650 }}>{row.tenNguoiMua || "—"}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {row.loaiNguoiMua === "CaNhan" ? "CCCD" : row.maSoThue ? "MST" : "MĐVCQHNS"}: {row.loaiNguoiMua === "CaNhan" ? row.soGiayTo || "—" : row.maSoThue || row.maDvcqhns || "—"}
                                    </Typography>
                                </TableCell>
                                <TableCell>{row.ngayHoaDon ? String(row.ngayHoaDon).slice(0, 10) : "—"}</TableCell>
                                <TableCell>{row.hanThanhToan ? String(row.hanThanhToan).slice(0, 10) : "—"}</TableCell>
                                <TableCell align="right">{fmtMoney(row.tongTienThanhToan, currencyAmountScale(row.maLoaiTien), row.maLoaiTien)} {row.maLoaiTien}</TableCell>
                                <TableCell><StatusChip status={row.maTrangThai} /></TableCell>
                                <TableCell>{row.tenNguoiDangKy || row.nguoiDangKyId}</TableCell>
                                <TableCell>{row.tenBoPhanNguoiTao || row.tenDonVi || "—"}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => navigateFromList(`/hoa-don-dien-tu/${row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
                                    {canEditInvoice(row, auth) && (
                                        <IconButton size="small" color="primary" onClick={() => navigateFromList(`/hoa-don-dien-tu/${row.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                                    )}
                                    {canDeleteInvoice(row, auth) && (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`Xóa hóa đơn ${row.maDangKy}`}
                                            onClick={() => setInvoiceToDelete(row)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!filteredRows.length && (
                            <TableRow>
                                <TableCell colSpan={12} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    {loading ? "Đang tải..." : "Chưa có hóa đơn phù hợp."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            </> : (
                <ImportGroupPanel
                    ref={importGroupPanelRef}
                    user={user}
                    auth={auth}
                    navigate={navigate}
                    returnTo={listReturnTo}
                    filters={groupFilters}
                    onFilterChange={updateListSearch}
                    onToast={showToast}
                />
            )}

            <Snackbar open={toast.open} autoHideDuration={3200} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>

            <Dialog open={confirmExportOpen} onClose={() => setConfirmExportOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Xác nhận hóa đơn đã xuất?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        {selectedExportableRows.length
                            ? `Sẽ chuyển ${selectedExportableRows.length} hóa đơn đã chọn từ trạng thái Sẵn sàng xuất sang Đã xuất.`
                            : "Chọn ít nhất một hóa đơn sẵn sàng xuất để xác nhận."}
                    </Typography>
                    {!!selectedExportableRows.length && (
                        <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 420, overflow: "auto", pr: 0.5 }}>
                            {selectedExportableRows.map((row) => {
                                const info = confirmExportInfo[row.id] || {};
                                return (
                                    <Box
                                        key={row.id}
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
                                            <Typography sx={{ fontWeight: 700 }}>{row.maDangKy}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                                {row.tenNguoiMua || "—"}
                                            </Typography>
                                        </Box>
                                        <TextField
                                            size="small"
                                            label="Số hóa đơn"
                                            value={info.soHoaDon || ""}
                                            onChange={(event) => setConfirmExportField(row.id, { soHoaDon: event.target.value })}
                                            required
                                        />
                                        <TextField
                                            size="small"
                                            label="Ký hiệu"
                                            value={info.kyHieuHoaDon || ""}
                                            onChange={(event) => setConfirmExportField(row.id, { kyHieuHoaDon: event.target.value })}
                                            required
                                        />
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Ngày phát hành"
                                            value={info.ngayPhatHanh || ""}
                                            onChange={(event) => setConfirmExportField(row.id, { ngayPhatHanh: event.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            required
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                    {!!selectedExportableRows.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                            Thông tin này sẽ được lưu vào phát hành hóa đơn và chuyển trạng thái sang Đã xuất.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmExportOpen(false)} disabled={confirmingExported}>Đóng</Button>
                    <Button
                        color="success"
                        variant="contained"
                        onClick={confirmSelectedExported}
                        disabled={confirmingExported || !selectedExportableRows.length}
                    >
                        Xác nhận đã xuất
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(invoiceToDelete)} onClose={() => !deletingInvoice && setInvoiceToDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa hồ sơ hóa đơn?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Hóa đơn {invoiceToDelete?.maDangKy || "này"} sẽ được xóa mềm. Toàn bộ file đính kèm sẽ bị xóa thật khỏi Google Drive hoặc vùng lưu trữ local cũ.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvoiceToDelete(null)} disabled={deletingInvoice}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDeleteInvoice} disabled={deletingInvoice}>
                        {deletingInvoice ? "Đang xóa..." : "Xóa hóa đơn"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
