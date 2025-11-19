import { useEffect, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
    Snackbar, Alert, IconButton, Stack, CircularProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { api } from "../lib/api";

export default function AdminSuppliers() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Dialog thêm/sửa
    const [openEditDlg, setOpenEditDlg] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = thêm mới
    const [name, setName] = useState("");
    const [stk, setStk] = useState("");
    const [maNH, setMaNH] = useState("");

    // Dialog xác nhận xoá
    const [confirming, setConfirming] = useState(null);

    // Toast
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const showToast = (msg, type = "success") => setToast({ open: true, msg, type });

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.listDonVi(); // [{ id, name, stk, maNganHang, TonTai }]
            setRows(data);
        } catch (e) {
            console.error(e);
            showToast("Tải danh sách đơn vị thất bại", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        setEditingId(null);
        setName("");
        setStk("");
        setMaNH("");
        setOpenEditDlg(true);
    };

    const openEdit = (r) => {
        setEditingId(r.id);
        setName(r.name || "");
        setStk(r.stk || "");
        setMaNH(r.maNganHang || "");
        setOpenEditDlg(true);
    };

    const save = async () => {
        const n = name.trim();
        const s = stk?.trim() || null;
        const m = maNH?.trim() || null;
        if (!n) {
            showToast("Tên đơn vị không được để trống", "error");
            return;
        }
        try {
            if (editingId) {
                await api.updateDonVi(editingId, { name: n, stk: s, maNganHang: m });
                showToast("Đã cập nhật đơn vị");
            } else {
                await api.createDonVi({ name: n, stk: s, maNganHang: m });
                showToast("Đã thêm đơn vị");
            }
            setOpenEditDlg(false);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.message || "Lưu đơn vị thất bại";
            showToast(msg, "error");
        }
    };

    const askRemove = (r) => setConfirming(r);

    const confirmRemove = async () => {
        if (!confirming) return;
        try {
            await api.deleteDonVi(confirming.id);
            showToast("Đã ngưng dùng đơn vị");
            setConfirming(null);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.message || "Xoá đơn vị thất bại";
            showToast(msg, "error");
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5" gutterBottom>Admin · Đơn vị hưởng thụ</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                    Thêm đơn vị
                </Button>
            </Stack>

            <Paper sx={{ mt: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Tên đơn vị</TableCell>
                            <TableCell>STK</TableCell>
                            <TableCell>Mã ngân hàng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                        <CircularProgress size={20} />
                                        <Typography variant="body2">Đang tải…</Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && rows.map((r, idx) => (
                            <TableRow key={r.id} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{r.name}</TableCell>
                                <TableCell>{r.stk || "—"}</TableCell>
                                <TableCell>{r.maNganHang || "—"}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={r.TonTai ? "Đang dùng" : "Ngưng"}
                                        color={r.TonTai ? "success" : "default"}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => openEdit(r)} aria-label="Sửa"><EditIcon /></IconButton>
                                    <IconButton color="error" onClick={() => askRemove(r)} aria-label="Xoá"><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Dialog thêm/sửa */}
            <Dialog open={openEditDlg} onClose={() => setOpenEditDlg(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? "Sửa đơn vị" : "Thêm đơn vị"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        label="Tên đơn vị (VD: Phòng Kế toán)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        label="Số tài khoản (STK)"
                        value={stk}
                        onChange={(e) => setStk(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                        placeholder="VD: 123456789"
                    />
                    <TextField
                        label="Mã ngân hàng"
                        value={maNH}
                        onChange={(e) => setMaNH(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                        placeholder="VD: VCB, BIDV, AGR..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDlg(false)}>Đóng</Button>
                    <Button variant="contained" onClick={save}>Lưu</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog xác nhận xoá */}
            <Dialog open={!!confirming} onClose={() => setConfirming(null)}>
                <DialogTitle>Xác nhận xoá</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn ngưng dùng đơn vị <b>{confirming?.name}</b>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirming(null)}>Huỷ</Button>
                    <Button color="error" variant="contained" onClick={confirmRemove}>Xoá</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar thông báo */}
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={toast.type} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
