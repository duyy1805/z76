import { useCallback, useEffect, useMemo, useState } from "react";
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
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { hoaDonApi } from "../../lib/api";

function groupStatus(group) {
    if (Number(group.soDaXoa || 0) === Number(group.soHoaDon || 0)) return { label: "Đã xóa", color: "default" };
    if (Number(group.soNhap || 0) === Number(group.soHoaDon || 0)) return { label: "Nháp", color: "default" };
    if (Number(group.soHoanTat || 0) === Number(group.soHoaDon || 0)) return { label: "Hoàn tất", color: "success" };
    return { label: "Đang xử lý", color: "warning" };
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

export default function ImportGroupPanel({ user, navigate, onToast }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [note, setNote] = useState("");
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [creating, setCreating] = useState(false);

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
            navigate(`/hoa-don-dien-tu/nhom-import/${result.group?.nhomImportId}`);
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
    const previewInvoices = useMemo(() => preview?.invoices || [], [preview]);

    return (
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>Tải lại</Button>
                <Button startIcon={<FileUploadIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Import Excel</Button>
            </Stack>

            <TableContainer component={Paper} elevation={0} sx={{ flex: 1, minHeight: 0, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã nhóm</TableCell>
                            <TableCell>File gốc</TableCell>
                            <TableCell>Người import</TableCell>
                            <TableCell>Ngày import</TableCell>
                            <TableCell align="center">Số hóa đơn</TableCell>
                            <TableCell>Tiến độ</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groups.map((group) => {
                            const status = groupStatus(group);
                            return (
                                <TableRow key={group.nhomImportId} hover>
                                    <TableCell sx={{ fontWeight: 750 }}>{group.maNhom}</TableCell>
                                    <TableCell>{group.fileName}</TableCell>
                                    <TableCell>{group.tenNguoiTao || group.nguoiTaoId}</TableCell>
                                    <TableCell>{group.ngayTao ? new Date(group.ngayTao).toLocaleString("vi-VN") : "—"}</TableCell>
                                    <TableCell align="center">{group.soHoaDon}</TableCell>
                                    <TableCell><Typography variant="caption">{GroupSummary({ group })}</Typography></TableCell>
                                    <TableCell><Chip size="small" label={status.label} color={status.color} /></TableCell>
                                    <TableCell align="right">
                                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/hoa-don-dien-tu/nhom-import/${group.nhomImportId}`)}>Xem</Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!groups.length && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    {loading ? "Đang tải..." : "Chưa có nhóm import nào."}
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
                        <Alert severity="info">Chỉ nhận file .xlsx theo đúng mẫu 21 cột đang được hệ thống xuất. Hóa đơn được tạo ở trạng thái nháp.</Alert>
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
                            <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => navigate(`/hoa-don-dien-tu/nhom-import/${preview.duplicateGroup.nhomImportId}`)}>Mở nhóm cũ</Button>}>
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
        </Stack>
    );
}
