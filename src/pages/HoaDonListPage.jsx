import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    IconButton,
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
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import StatusChip from "../components/StatusChip";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { canEditInvoice, fmtMoney, INVOICE_STATUS_OPTIONS, INVOICE_TYPE_LABELS } from "../utils/hoa-don";

export default function HoaDonListPage() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { user } = auth;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filters, setFilters] = useState({ tukhoa: "", maTrangThai: "", maLoaiHoaDon: "", dateFrom: "", dateTo: "" });
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const params = useMemo(() => ({
        userId: user?.id,
        idDonVi: user?.idDonVi,
        ...filters,
    }), [user?.id, user?.idDonVi, filters]);

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

    const setFilter = (patch) => setFilters((current) => ({ ...current, ...patch }));

    const exportableRows = rows.filter((row) => row.maTrangThai === "SanSangXuat");
    const exportableIds = exportableRows.map((row) => row.id);
    const selectedExportableIds = selectedIds.filter((id) => exportableIds.includes(id));
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
                <Stack direction="row" spacing={1}>
                    <Button
                        startIcon={<DownloadIcon />}
                        variant="outlined"
                        onClick={exportSelected}
                        disabled={exporting || !selectedExportableIds.length}
                    >
                        Xuất file import ({selectedExportableIds.length})
                    </Button>
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>Tải lại</Button>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate("/hoa-don-dien-tu/new")}>Tạo hóa đơn</Button>
                </Stack>
            </Stack>

            <Paper elevation={0} sx={{ p: 1.5, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr 1fr 1fr 1fr" }, gap: 1.25 }}>
                    <TextField size="small" label="Từ khóa" value={filters.tukhoa} onChange={(e) => setFilter({ tukhoa: e.target.value })} placeholder="Mã đăng ký, người mua, MST..." />
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
                            <TableCell>Mã ĐK</TableCell>
                            <TableCell>Loại</TableCell>
                            <TableCell>Người mua</TableCell>
                            <TableCell>Ngày HĐ</TableCell>
                            <TableCell align="right">Thanh toán</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Người tạo</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={selectedIds.includes(row.id)}
                                        disabled={row.maTrangThai !== "SanSangXuat"}
                                        onChange={() => toggleRow(row.id)}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 750 }}>{row.maDangKy}</TableCell>
                                <TableCell>{INVOICE_TYPE_LABELS[row.maLoaiHoaDon] || row.maLoaiHoaDon}</TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 650 }}>{row.tenNguoiMua || "—"}</Typography>
                                    <Typography variant="caption" color="text.secondary">MST: {row.maSoThue || "—"}</Typography>
                                </TableCell>
                                <TableCell>{row.ngayHoaDon ? String(row.ngayHoaDon).slice(0, 10) : "—"}</TableCell>
                                <TableCell align="right">{fmtMoney(row.tongTienThanhToan)} {row.maLoaiTien}</TableCell>
                                <TableCell><StatusChip status={row.maTrangThai} /></TableCell>
                                <TableCell>{row.tenNguoiDangKy || row.nguoiDangKyId}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => navigate(`/hoa-don-dien-tu/${row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
                                    {canEditInvoice(row, auth) && (
                                        <IconButton size="small" color="primary" onClick={() => navigate(`/hoa-don-dien-tu/${row.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!rows.length && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    {loading ? "Đang tải..." : "Chưa có hóa đơn phù hợp."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={toast.open} autoHideDuration={3200} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
