import { useCallback, useEffect, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
    Snackbar, Alert, IconButton, Stack, CircularProgress, Tabs, Tab
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { api } from "../lib/api";

function SupplierLookup() {
    const [rows, setRows] = useState([]);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);

    // Dialog thêm/sửa
    const [openEditDlg, setOpenEditDlg] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = thêm mới
    const [name, setName] = useState("");
    const [stk, setStk] = useState("");
    const [maNH, setMaNH] = useState("");
    const [chiNhanhNH, setChiNhanhNH] = useState("");

    // Dialog xác nhận xoá
    const [confirming, setConfirming] = useState(null);

    // Toast
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const showToast = (msg, type = "success") => setToast({ open: true, msg, type });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [data, bankRows] = await Promise.all([
                api.listDonVi(),
                api.listNganHang({ tontai: 1 }),
            ]);
            setRows(data);
            setBanks(bankRows || []);
        } catch (e) {
            console.error(e);
            showToast("Tải danh sách đơn vị thất bại", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditingId(null);
        setName("");
        setStk("");
        setMaNH("");
        setChiNhanhNH("");
        setOpenEditDlg(true);
    };

    const openEdit = (r) => {
        setEditingId(r.id);
        setName(r.name || "");
        setStk(r.stk || "");
        setMaNH(r.maNganHang || "");
        setChiNhanhNH(r.chiNhanhNganHang || "");
        setOpenEditDlg(true);
    };

    const save = async () => {
        const n = name.trim();
        const s = stk?.trim() || null;
        const m = maNH?.trim() || null;
        const branch = chiNhanhNH?.trim() || null;
        const bankExists = banks.some((bank) => bank.MaNganHang === m);
        if (!n || !s || !m || !bankExists) {
            showToast("Nhập đủ tên đơn vị, số tài khoản và chọn ngân hàng từ danh mục", "error");
            return;
        }
        try {
            if (editingId) {
                await api.updateDonVi(editingId, { name: n, stk: s, maNganHang: m, chiNhanhNganHang: branch });
                showToast("Đã cập nhật đơn vị");
            } else {
                await api.createDonVi({ name: n, stk: s, maNganHang: m, chiNhanhNganHang: branch });
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
                            <TableCell>Chi nhánh ngân hàng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                        <CircularProgress size={20} />
                                        <Typography variant="body2">Đang tải…</Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && rows.map((r, idx) => (
                            <TableRow key={r.id} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{r.name}</TableCell>
                                <TableCell>{r.stk || "—"}</TableCell>
                                <TableCell>{r.maNganHang ? `${r.maNganHang}${r.tenNganHang ? ` - ${r.tenNganHang}` : ""}` : "—"}</TableCell>
                                <TableCell>{r.chiNhanhNganHang || "—"}</TableCell>
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
                        required
                        sx={{ mt: 2 }}
                        placeholder="VD: 123456789"
                    />
                    <Autocomplete
                        options={banks}
                        value={banks.find((bank) => bank.MaNganHang === maNH) || null}
                        onChange={(_, value) => setMaNH(value?.MaNganHang || "")}
                        getOptionLabel={(option) => option ? `${option.MaNganHang} - ${option.TenNganHang}` : ""}
                        isOptionEqualToValue={(option, value) => option.MaNganHang === value.MaNganHang}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Ngân hàng"
                                required
                                placeholder="Chọn mã ngân hàng"
                            />
                        )}
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                    <TextField
                        label="Chi nhánh ngân hàng (không bắt buộc)"
                        value={chiNhanhNH}
                        onChange={(e) => setChiNhanhNH(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                        placeholder="VD: Chi nhánh Hà Nội"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDlg(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        onClick={save}
                        disabled={!name.trim() || !stk.trim() || !banks.some((bank) => bank.MaNganHang === maNH)}
                    >
                        Lưu
                    </Button>
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

function CurrencyLookup() {
    const [rows, setRows] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const showToast = (msg, type = "success") => setToast({ open: true, msg, type });
    const load = useCallback(async () => setRows(await api.listLoaiTien()), []);
    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditing(null); setCode(""); setName(""); setOpen(true); };
    const openEdit = (row) => { setEditing(row); setCode(row.MaLoaiTien); setName(row.TenLoaiTien); setOpen(true); };
    const save = async () => {
        try {
            if (!code.trim() || !name.trim()) return showToast("Nhập đủ mã và tên loại tiền", "error");
            if (editing) await api.updateLoaiTien(editing.MaLoaiTien, { tenLoaiTien: name.trim(), tonTai: editing.TonTai });
            else await api.createLoaiTien({ maLoaiTien: code.trim(), tenLoaiTien: name.trim() });
            setOpen(false);
            await load();
            showToast("Đã lưu loại tiền");
        } catch (err) {
            showToast(err?.response?.data?.message || "Lưu loại tiền thất bại", "error");
        }
    };
    const stop = async (row) => {
        try {
            await api.deleteLoaiTien(row.MaLoaiTien);
            await load();
            showToast("Đã ngừng sử dụng loại tiền");
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể ngừng sử dụng loại tiền", "error");
        }
    };
    const activate = async (row) => {
        await api.updateLoaiTien(row.MaLoaiTien, { tenLoaiTien: row.TenLoaiTien, tonTai: true });
        await load();
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">Admin · Loại tiền</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Thêm loại tiền</Button>
            </Stack>
            <Paper sx={{ mt: 1, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead><TableRow><TableCell>Mã</TableCell><TableCell>Tên loại tiền</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.MaLoaiTien}>
                                <TableCell>{row.MaLoaiTien}</TableCell><TableCell>{row.TenLoaiTien}</TableCell>
                                <TableCell><Chip size="small" label={row.TonTai ? "Đang dùng" : "Ngừng"} color={row.TonTai ? "success" : "default"} /></TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => openEdit(row)}><EditIcon /></IconButton>
                                    {row.MaLoaiTien !== "VND" && (row.TonTai
                                        ? <IconButton color="error" onClick={() => stop(row)}><DeleteIcon /></IconButton>
                                        : <Button size="small" onClick={() => activate(row)}>Bật lại</Button>)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? "Sửa loại tiền" : "Thêm loại tiền"}</DialogTitle>
                <DialogContent>
                    <TextField label="Mã loại tiền" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!editing} fullWidth sx={{ mt: 1 }} />
                    <TextField label="Tên loại tiền" value={name} onChange={(e) => setName(e.target.value)} fullWidth sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions><Button onClick={() => setOpen(false)}>Đóng</Button><Button variant="contained" onClick={save}>Lưu</Button></DialogActions>
            </Dialog>
            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}

function BankLookup() {
    const [rows, setRows] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const showToast = (msg, type = "success") => setToast({ open: true, msg, type });
    const load = useCallback(async () => setRows(await api.listNganHang()), []);
    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditing(null); setCode(""); setName(""); setOpen(true); };
    const openEdit = (row) => {
        setEditing(row);
        setCode(row.MaNganHang);
        setName(row.TenNganHang);
        setOpen(true);
    };
    const save = async () => {
        try {
            if (!code.trim() || !name.trim()) return showToast("Nhập đủ mã và tên ngân hàng", "error");
            if (editing) await api.updateNganHang(editing.MaNganHang, { tenNganHang: name.trim(), tonTai: editing.TonTai });
            else await api.createNganHang({ maNganHang: code.trim(), tenNganHang: name.trim() });
            setOpen(false);
            await load();
            showToast("Đã lưu ngân hàng");
        } catch (err) {
            showToast(err?.response?.data?.message || "Lưu ngân hàng thất bại", "error");
        }
    };
    const stop = async (row) => {
        try {
            await api.deleteNganHang(row.MaNganHang);
            await load();
            showToast("Đã ngừng sử dụng ngân hàng");
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể ngừng sử dụng ngân hàng", "error");
        }
    };
    const activate = async (row) => {
        await api.updateNganHang(row.MaNganHang, { tenNganHang: row.TenNganHang, tonTai: true });
        await load();
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">Admin · Ngân hàng</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Thêm ngân hàng</Button>
            </Stack>
            <Paper sx={{ mt: 1, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã ngân hàng</TableCell>
                            <TableCell>Tên ngân hàng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.MaNganHang}>
                                <TableCell>{row.MaNganHang}</TableCell>
                                <TableCell>{row.TenNganHang}</TableCell>
                                <TableCell><Chip size="small" label={row.TonTai ? "Đang dùng" : "Ngừng"} color={row.TonTai ? "success" : "default"} /></TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => openEdit(row)}><EditIcon /></IconButton>
                                    {row.TonTai
                                        ? <IconButton color="error" onClick={() => stop(row)}><DeleteIcon /></IconButton>
                                        : <Button size="small" onClick={() => activate(row)}>Bật lại</Button>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? "Sửa ngân hàng" : "Thêm ngân hàng"}</DialogTitle>
                <DialogContent>
                    <TextField label="Mã ngân hàng" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!editing} fullWidth sx={{ mt: 1 }} />
                    <TextField label="Tên ngân hàng" value={name} onChange={(e) => setName(e.target.value)} fullWidth sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions><Button onClick={() => setOpen(false)}>Đóng</Button><Button variant="contained" onClick={save}>Lưu</Button></DialogActions>
            </Dialog>
            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}

export default function AdminSuppliers() {
    const [tab, setTab] = useState(0);
    return (
        <Box>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Đơn vị hưởng thụ" />
                <Tab label="Loại tiền" />
                <Tab label="Ngân hàng" />
            </Tabs>
            {tab === 0 && <SupplierLookup />}
            {tab === 1 && <CurrencyLookup />}
            {tab === 2 && <BankLookup />}
        </Box>
    );
}
