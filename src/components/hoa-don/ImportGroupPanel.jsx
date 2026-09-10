import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
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
    Divider,
    IconButton,
    MenuItem,
    Paper,
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
import FileUploadIcon from "@mui/icons-material/FileUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import { hoaDonApi } from "../../lib/api";
import { hasInvoicePermission } from "../../utils/hoa-don";
import { UPDATED_IMPORT_HEADERS } from "../../utils/hoa-don-excel";
import { withInvoiceReturnTo } from "../../utils/hoa-don-navigation";
import TableHeaderFilter from "./TableHeaderFilter";

function groupStatus(group) {
    if (Number(group.soDaXoa || 0) === Number(group.soHoaDon || 0)) return { value: "deleted", label: "Đã xóa", color: "default" };
    if (Number(group.soNhap || 0) === Number(group.soHoaDon || 0)) return { value: "draft", label: "Nháp", color: "default" };
    if (Number(group.soSanSangXuat || 0) === Number(group.soHoaDon || 0)) return { value: "ready", label: "Sẵn sàng xuất", color: "primary" };
    if (Number(group.soHoanTat || 0) === Number(group.soHoaDon || 0)) return { value: "completed", label: "Hoàn tất", color: "success" };
    return { value: "processing", label: "Đang xử lý", color: "warning" };
}

function normalizeSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function localDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function downloadImportTemplate() {
    const emptyRows = Array.from({ length: 2 }, () => UPDATED_IMPORT_HEADERS.map(() => ""));
    const worksheet = XLSX.utils.aoa_to_sheet([UPDATED_IMPORT_HEADERS, ...emptyRows]);
    worksheet["!cols"] = UPDATED_IMPORT_HEADERS.map((header) => ({
        wch: Math.min(Math.max(header.length + 2, header.includes("Tên") || header === "Địa chỉ" ? 28 : 14), 42),
    }));
    worksheet["!autofilter"] = { ref: `A1:V3` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hóa đơn GTGT");
    XLSX.writeFile(workbook, "mau-import-nhom-hoa-don-22-cot.xlsx");
}

function GroupSummary({ group }) {
    const parts = [
        ["Nháp", group.soNhap],
        ["Chờ TBP", group.soChoDuyetTBP],
        ["Chờ xử lý", group.soChoXuLy],
        ["Sẵn sàng xuất", group.soSanSangXuat],
        ["Hoàn tất", group.soHoanTat],
        ["Từ chối", group.soTuChoi],
        ["Đã xóa", group.soDaXoa],
    ].filter(([, count]) => Number(count || 0) > 0);
    return parts.map(([label, count]) => `${label}: ${count}`).join(" · ") || "Chưa có dữ liệu";
}

const ImportGroupPanel = forwardRef(function ImportGroupPanel({ user, auth, navigate, returnTo, filters, onFilterChange, onToast }, ref) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [note, setNote] = useState("");
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [deletingGroup, setDeletingGroup] = useState(false);
    const [columnFilters, setColumnFilters] = useState({ maNhom: "", fileName: "", department: "", countFrom: "", countTo: "", progress: "" });
    const setColumnFilter = (patch) => setColumnFilters((current) => ({ ...current, ...patch }));

    const load = useCallback(async () => {
        if (!user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            setGroups(await hoaDonApi.listNhomImport(user));
        } catch (error) {
            onToast("error", error?.response?.data?.message || "Không lấy được danh sách nhóm import.");
        } finally {
            setLoading(false);
        }
    }, [onToast, user]);

    useEffect(() => {
        load();
    }, [load]);

    const closeDialog = () => {
        if (previewing || creating) return;
        setDialogOpen(false);
        setFile(null);
        setPreview(null);
        setNote("");
    };

    const chooseFile = (event) => {
        const nextFile = event.target.files?.[0] || null;
        setFile(nextFile);
        setPreview(null);
        event.target.value = "";
    };

    const readPreview = async () => {
        if (!file) return;
        setPreviewing(true);
        try {
            setPreview(await hoaDonApi.previewNhomImport(file, user));
        } catch (error) {
            const data = error?.response?.data;
            setPreview(data?.errors ? { errors: data.errors, warnings: data.warnings || [], invoices: [] } : null);
            onToast("error", data?.message || "Không đọc được file Excel.");
        } finally {
            setPreviewing(false);
        }
    };

    const createGroup = async () => {
        if (!file || !preview || preview.errors?.length || preview.duplicateGroup) return;
        setCreating(true);
        try {
            const result = await hoaDonApi.createNhomImport(file, user, note);
            onToast("success", `Đã tạo nhóm ${result.group?.maNhom} gồm ${result.group?.soHoaDon} hóa đơn nháp.`);
            closeDialog();
            navigate(withInvoiceReturnTo(`/hoa-don-dien-tu/nhom-import/${result.group?.nhomImportId}`, returnTo));
        } catch (error) {
            const duplicate = error?.response?.data?.duplicateGroup;
            if (duplicate?.nhomImportId) {
                setPreview((current) => ({ ...current, duplicateGroup: duplicate }));
            }
            onToast("error", error?.response?.data?.message || "Tạo nhóm import thất bại.");
        } finally {
            setCreating(false);
        }
    };

    const canCreate = Boolean(file && preview && !preview.errors?.length && !preview.duplicateGroup);

    useImperativeHandle(ref, () => ({
        reload: load,
        openImport: () => setDialogOpen(true),
        loading,
    }), [load, loading]);
    const previewInvoices = useMemo(() => preview?.invoices || [], [preview]);
    const canDeleteGroups = hasInvoicePermission(auth, "HD_Admin");
    const filteredGroups = useMemo(() => {
        const keyword = normalizeSearch(filters?.keyword);
        const creator = normalizeSearch(filters?.creator);
        const groupCode = normalizeSearch(columnFilters.maNhom);
        const fileName = normalizeSearch(columnFilters.fileName);
        const department = normalizeSearch(columnFilters.department);
        const progress = normalizeSearch(columnFilters.progress);
        const countFrom = Number(columnFilters.countFrom);
        const countTo = Number(columnFilters.countTo);
        return groups.filter((group) => {
            const status = groupStatus(group).value;
            const createdDate = localDateKey(group.ngayTao);
            const matchesKeyword = !keyword || normalizeSearch([
                group.maNhom,
                group.fileName,
                group.ghiChu,
                group.tenDonVi,
            ].filter(Boolean).join(" ")).includes(keyword);
            const matchesCreator = !creator || normalizeSearch([group.tenNguoiTao, group.nguoiTaoId, group.tenDonVi].filter(Boolean).join(" ")).includes(creator);
            const matchesStatus = !filters?.status || filters.status === status;
            const matchesFrom = !filters?.dateFrom || createdDate >= filters.dateFrom;
            const matchesTo = !filters?.dateTo || createdDate <= filters.dateTo;
            const invoiceCount = Number(group.soHoaDon || 0);
            const matchesGroupCode = !groupCode || normalizeSearch(group.maNhom).includes(groupCode);
            const matchesFileName = !fileName || normalizeSearch(group.fileName).includes(fileName);
            const matchesDepartment = !department || normalizeSearch(group.tenDonVi).includes(department);
            const matchesCountFrom = columnFilters.countFrom === "" || invoiceCount >= countFrom;
            const matchesCountTo = columnFilters.countTo === "" || invoiceCount <= countTo;
            const matchesProgress = !progress || normalizeSearch(GroupSummary({ group })).includes(progress);
            return matchesKeyword && matchesCreator && matchesStatus && matchesFrom && matchesTo && matchesGroupCode && matchesFileName && matchesDepartment && matchesCountFrom && matchesCountTo && matchesProgress;
        });
    }, [columnFilters, filters, groups]);
    const hasFilters = Boolean(filters?.keyword || filters?.creator || filters?.status || filters?.dateFrom || filters?.dateTo);

    const confirmDeleteGroup = async () => {
        if (!groupToDelete?.nhomImportId) return;
        setDeletingGroup(true);
        try {
            await hoaDonApi.deleteNhomImport(groupToDelete.nhomImportId, user);
            setGroupToDelete(null);
            onToast("success", `Đã xóa nhóm ${groupToDelete.maNhom} và file Excel gốc. Các hóa đơn trong nhóm vẫn được giữ nguyên.`);
            await load();
        } catch (error) {
            onToast("error", error?.response?.data?.message || "Xóa nhóm import thất bại.");
        } finally {
            setDeletingGroup(false);
        }
    };

    return (
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <Paper elevation={0} sx={{ p: 1.5, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.35fr 1fr 1fr 1fr 1fr auto" }, gap: 1.25, alignItems: "center" }}>
                    <TextField
                        size="small"
                        label="Tìm nhóm import"
                        placeholder="Mã nhóm, tên file, ghi chú, đơn vị..."
                        value={filters?.keyword || ""}
                        onChange={(event) => onFilterChange({ groupKeyword: event.target.value })}
                    />
                    <TextField
                        size="small"
                        label="Người import"
                        placeholder="Tên, ID hoặc bộ phận..."
                        value={filters?.creator || ""}
                        onChange={(event) => onFilterChange({ groupCreator: event.target.value })}
                    />
                    <TextField
                        select
                        size="small"
                        label="Trạng thái nhóm"
                        value={filters?.status || ""}
                        onChange={(event) => onFilterChange({ groupStatus: event.target.value })}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="draft">Nháp</MenuItem>
                        <MenuItem value="processing">Đang xử lý</MenuItem>
                        <MenuItem value="ready">Sẵn sàng xuất</MenuItem>
                        <MenuItem value="completed">Hoàn tất</MenuItem>
                        <MenuItem value="deleted">Đã xóa</MenuItem>
                    </TextField>
                    <TextField size="small" type="date" label="Từ ngày" value={filters?.dateFrom || ""} onChange={(event) => onFilterChange({ groupDateFrom: event.target.value })} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="date" label="Đến ngày" value={filters?.dateTo || ""} onChange={(event) => onFilterChange({ groupDateTo: event.target.value })} InputLabelProps={{ shrink: true }} />
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        disabled={!hasFilters}
                        onClick={() => onFilterChange({ groupKeyword: "", groupCreator: "", groupStatus: "", groupDateFrom: "", groupDateTo: "" })}
                    >
                        Xóa lọc
                    </Button>
                </Box>
            </Paper>

            <TableContainer component={Paper} elevation={0} sx={{ flex: 1, minHeight: 0, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><TableHeaderFilter label="Mã nhóm" active={Boolean(columnFilters.maNhom)} onClear={() => setColumnFilter({ maNhom: "" })}><TextField autoFocus size="small" label="Mã nhóm" value={columnFilters.maNhom} onChange={(event) => setColumnFilter({ maNhom: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="File gốc" active={Boolean(columnFilters.fileName)} onClear={() => setColumnFilter({ fileName: "" })}><TextField autoFocus size="small" label="Tên file" value={columnFilters.fileName} onChange={(event) => setColumnFilter({ fileName: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Người import" active={Boolean(filters?.creator)} onClear={() => onFilterChange({ groupCreator: "" })}><TextField autoFocus size="small" label="Người import" value={filters?.creator || ""} onChange={(event) => onFilterChange({ groupCreator: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell sx={{ minWidth: 180 }}><TableHeaderFilter label="Bộ phận người tạo" active={Boolean(columnFilters.department)} onClear={() => setColumnFilter({ department: "" })}><TextField autoFocus size="small" label="Bộ phận" value={columnFilters.department} onChange={(event) => setColumnFilter({ department: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Ngày import" active={Boolean(filters?.dateFrom || filters?.dateTo)} onClear={() => onFilterChange({ groupDateFrom: "", groupDateTo: "" })}><TextField size="small" type="date" label="Từ ngày" value={filters?.dateFrom || ""} onChange={(event) => onFilterChange({ groupDateFrom: event.target.value })} InputLabelProps={{ shrink: true }} /><TextField size="small" type="date" label="Đến ngày" value={filters?.dateTo || ""} onChange={(event) => onFilterChange({ groupDateTo: event.target.value })} InputLabelProps={{ shrink: true }} /></TableHeaderFilter></TableCell>
                            <TableCell align="center"><TableHeaderFilter label="Số hóa đơn" active={Boolean(columnFilters.countFrom || columnFilters.countTo)} onClear={() => setColumnFilter({ countFrom: "", countTo: "" })}><TextField size="small" type="number" label="Từ" value={columnFilters.countFrom} onChange={(event) => setColumnFilter({ countFrom: event.target.value })} /><TextField size="small" type="number" label="Đến" value={columnFilters.countTo} onChange={(event) => setColumnFilter({ countTo: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Tiến độ" active={Boolean(columnFilters.progress)} onClear={() => setColumnFilter({ progress: "" })}><TextField autoFocus size="small" label="Nội dung tiến độ" value={columnFilters.progress} onChange={(event) => setColumnFilter({ progress: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Trạng thái" active={Boolean(filters?.status)} onClear={() => onFilterChange({ groupStatus: "" })}><TextField select size="small" label="Trạng thái nhóm" value={filters?.status || ""} onChange={(event) => onFilterChange({ groupStatus: event.target.value })}><MenuItem value="">Tất cả</MenuItem><MenuItem value="draft">Nháp</MenuItem><MenuItem value="processing">Đang xử lý</MenuItem><MenuItem value="ready">Sẵn sàng xuất</MenuItem><MenuItem value="completed">Hoàn tất</MenuItem><MenuItem value="deleted">Đã xóa</MenuItem></TextField></TableHeaderFilter></TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredGroups.map((group) => {
                            const status = groupStatus(group);
                            return (
                                <TableRow key={group.nhomImportId} hover>
                                    <TableCell sx={{ fontWeight: 750 }}>{group.maNhom}</TableCell>
                                    <TableCell>{group.fileName}</TableCell>
                                    <TableCell>{group.tenNguoiTao || group.nguoiTaoId}</TableCell>
                                    <TableCell>{group.tenDonVi || "—"}</TableCell>
                                    <TableCell>{group.ngayTao ? new Date(group.ngayTao).toLocaleString("vi-VN") : "—"}</TableCell>
                                    <TableCell align="center">{group.soHoaDon}</TableCell>
                                    <TableCell><Typography variant="caption">{GroupSummary({ group })}</Typography></TableCell>
                                    <TableCell><Chip size="small" label={status.label} color={status.color} /></TableCell>
                                    <TableCell align="right">
                                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(withInvoiceReturnTo(`/hoa-don-dien-tu/nhom-import/${group.nhomImportId}`, returnTo))}>Xem</Button>
                                        {canDeleteGroups && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label={`Xóa nhóm import ${group.maNhom}`}
                                                onClick={() => setGroupToDelete(group)}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!filteredGroups.length && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    {loading ? "Đang tải..." : hasFilters ? "Không có nhóm import phù hợp bộ lọc." : "Chưa có nhóm import nào."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="lg" fullWidth>
                <DialogTitle>Import nhóm hóa đơn từ Excel</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Alert
                            severity="info"
                            action={(
                                <Button color="inherit" size="small" startIcon={<DownloadIcon />} onClick={downloadImportTemplate} sx={{ whiteSpace: "nowrap" }}>
                                    Tải file mẫu
                                </Button>
                            )}
                        >
                            Nhận file .xlsx mẫu 22 cột có “Thời hạn thanh toán” hoặc mẫu 21 cột cũ. File cũ vẫn tạo được nháp nhưng phải bổ sung thời hạn trước khi trình. Hóa đơn import mặc định là hóa đơn xuất khẩu, loại hình doanh thu xuất khẩu và thuế GTGT 0%.
                        </Alert>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                            <Button component="label" variant="outlined" startIcon={<FileUploadIcon />}>
                                Chọn file
                                <input hidden type="file" accept=".xlsx" onChange={chooseFile} />
                            </Button>
                            <Typography sx={{ flex: 1 }} color={file ? "text.primary" : "text.secondary"}>{file?.name || "Chưa chọn file"}</Typography>
                            <Button variant="contained" onClick={readPreview} disabled={!file || previewing || creating}>
                                {previewing ? <CircularProgress size={22} /> : "Đọc và kiểm tra"}
                            </Button>
                        </Stack>
                        <TextField label="Ghi chú nhóm" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />

                        {preview?.duplicateGroup && (
                            <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => navigate(withInvoiceReturnTo(`/hoa-don-dien-tu/nhom-import/${preview.duplicateGroup.nhomImportId}`, returnTo))}>Mở nhóm cũ</Button>}>
                                File đã được import trong nhóm {preview.duplicateGroup.maNhom}.
                            </Alert>
                        )}
                        {!!preview?.errors?.length && (
                            <Alert severity="error">
                                <Typography sx={{ fontWeight: 700 }}>File có {preview.errors.length} lỗi và chưa thể import:</Typography>
                                {preview.errors.slice(0, 20).map((error, index) => (
                                    <Typography key={`${error.row}-${error.column}-${index}`} variant="body2">
                                        {error.row ? `Dòng ${error.row}${error.column ? `, cột ${error.column}` : ""}: ` : ""}{error.message}
                                    </Typography>
                                ))}
                            </Alert>
                        )}
                        {!!preview?.warnings?.length && (
                            <Alert severity="warning">Có {preview.warnings.length} cảnh báo. Các thông tin thiếu có thể bổ sung sau khi lưu nháp.</Alert>
                        )}

                        {!!previewInvoices.length && (
                            <>
                                <Divider />
                                <Typography sx={{ fontWeight: 750 }}>Xem trước {previewInvoices.length} hóa đơn</Typography>
                                <TableContainer sx={{ maxHeight: 330, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead><TableRow><TableCell>STT</TableCell><TableCell>Người mua</TableCell><TableCell>Ngày HĐ</TableCell><TableCell>Loại tiền</TableCell><TableCell align="center">Dòng hàng</TableCell><TableCell align="center">Cảnh báo</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {previewInvoices.map((invoice) => (
                                                <TableRow key={invoice.invoiceOrder}>
                                                    <TableCell>{invoice.invoiceOrder}</TableCell>
                                                    <TableCell>{invoice.tenNguoiMuaSnapshot || "Chưa nhập"}</TableCell>
                                                    <TableCell>{invoice.ngayHoaDon || "Chưa nhập"}</TableCell>
                                                    <TableCell>{invoice.maLoaiTien}</TableCell>
                                                    <TableCell align="center">{invoice.chiTiet?.length || 0}</TableCell>
                                                    <TableCell align="center">{invoice.warnings?.length || 0}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={previewing || creating}>Đóng</Button>
                    <Button variant="contained" onClick={createGroup} disabled={!canCreate || creating}>
                        {creating ? "Đang tạo nhóm..." : "Tạo nhóm nháp"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(groupToDelete)} onClose={() => !deletingGroup && setGroupToDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa nhóm import?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Nhóm {groupToDelete?.maNhom || "này"} sẽ không còn hiển thị và file Excel gốc sẽ bị xóa thật khỏi Google Drive hoặc vùng lưu trữ local cũ. Các hóa đơn trong nhóm vẫn được giữ nguyên.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGroupToDelete(null)} disabled={deletingGroup}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDeleteGroup} disabled={deletingGroup}>
                        {deletingGroup ? "Đang xóa..." : "Xóa nhóm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
});

export default ImportGroupPanel;
