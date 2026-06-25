import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
    Snackbar, Alert, IconButton, Stack, CircularProgress, Tabs, Tab, MenuItem
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { EXPENSE_LABELS } from "../utils/phieu-sec";

const normalizeSearch = (value = "") =>
    String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();

const BANK_TRANSFER_GUIDE_IMAGES = [
    {
        src: "/assets/image/nh1.jpg",
        alt: "Màn hình nhập số tài khoản và chọn ngân hàng hưởng thụ",
        caption: "Nhập STK và chọn đúng ngân hàng.",
    },
    {
        src: "/assets/image/nh2.jpg",
        alt: "Màn hình app ngân hàng hiển thị tên người nhận sau khi chọn tài khoản",
        caption: "Lấy tên người nhận hiện ra.",
    },
];

const BankTransferNameGuide = () => {
    const [previewImage, setPreviewImage] = useState(null);

    return (
        <>
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    height: "fit-content",
                }}
            >
                <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Cách lấy tên chuyển khoản
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 1.25,
                        }}
                    >
                        {BANK_TRANSFER_GUIDE_IMAGES.map((image) => (
                            <Box key={image.src}>
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => setPreviewImage(image)}
                                    sx={{
                                        p: 0,
                                        width: "100%",
                                        aspectRatio: "9 / 14",
                                        border: (t) => `1px solid ${t.palette.divider}`,
                                        borderRadius: 1.5,
                                        bgcolor: "background.paper",
                                        cursor: "zoom-in",
                                        display: "block",
                                    }}
                                >
                                    <Box
                                        component="img"
                                        alt={image.alt}
                                        src={image.src}
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                            display: "block",
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                    {image.caption}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    <Stack spacing={1}>
                        {[
                            "Mở app ngân hàng và chọn chuyển tiền.",
                            "Nhập số tài khoản, chọn đúng ngân hàng.",
                            "Đợi app hiện tên người nhận, rồi nhập đúng tên đó vào ô Tên chuyển khoản.",
                        ].map((text, index) => (
                            <Stack key={text} direction="row" spacing={1} alignItems="flex-start">
                                <Box
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: "50%",
                                        bgcolor: "primary.main",
                                        color: "primary.contrastText",
                                        fontSize: 12,
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        mt: 0.2,
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {text}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Bấm vào ảnh để xem lớn.
                    </Typography>
                </Stack>
            </Paper>
            <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{previewImage?.caption || "Ảnh hướng dẫn"}</DialogTitle>
                <DialogContent>
                    {previewImage && (
                        <Box
                            component="img"
                            alt={previewImage.alt}
                            src={previewImage.src}
                            sx={{
                                width: "100%",
                                maxHeight: "78vh",
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 1.5,
                                bgcolor: "background.paper",
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewImage(null)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

function SupplierLookup() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { role, user, permissions = [] } = useAuth();
    const [rows, setRows] = useState([]);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Dialog thêm/sửa
    const [openEditDlg, setOpenEditDlg] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = thêm mới
    const [name, setName] = useState("");
    const [tenChuyenKhoan, setTenChuyenKhoan] = useState("");
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
        setTenChuyenKhoan("");
        setStk("");
        setMaNH("");
        setChiNhanhNH("");
        setOpenEditDlg(true);
    };

    const openEdit = (r) => {
        setEditingId(r.id);
        setName(r.name || "");
        setTenChuyenKhoan(r.tenChuyenKhoan || "");
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
        const transferName = tenChuyenKhoan?.trim() || null;
        const bankExists = banks.some((bank) => bank.MaNganHang === m);
        if (!n || !transferName || !s || !m || !bankExists) {
            showToast("Nhập đủ tên đơn vị, tên chuyển khoản, số tài khoản và chọn ngân hàng từ danh mục", "error");
            return;
        }
        try {
            if (editingId) {
                await api.updateDonVi(editingId, {
                    name: n,
                    stk: s,
                    maNganHang: m,
                    chiNhanhNganHang: branch,
                    tenChuyenKhoan: transferName,
                    requesterUserId: user?.id,
                    requesterRoleCode: role === "Admin" || permissions.includes("Admin") ? "Admin" : role,
                });
                showToast("Đã cập nhật đơn vị");
            } else {
                await api.createDonVi({ name: n, stk: s, maNganHang: m, chiNhanhNganHang: branch, tenChuyenKhoan: transferName });
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

    const filteredRows = useMemo(() => {
        const q = normalizeSearch(query.trim());
        return rows.filter((row) => {
            const okStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && row.TonTai) ||
                (statusFilter === "inactive" && !row.TonTai);
            const searchable = normalizeSearch([
                row.name,
                row.tenChuyenKhoan,
                row.stk,
                row.maNganHang,
                row.tenNganHang,
                row.chiNhanhNganHang,
            ].filter(Boolean).join(" "));
            return okStatus && (!q || searchable.includes(q));
        });
    }, [rows, query, statusFilter]);

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
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: "1.15rem", sm: "1.5rem" }, fontWeight: 800 }}>Admin · Đơn vị hưởng thụ</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                    Thêm đơn vị
                </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1 }}>
                <TextField
                    label="Tìm kiếm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Tên, tên chuyển khoản, STK, mã/tên ngân hàng, chi nhánh"
                />
                <TextField
                    select
                    label="Trạng thái"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="active">Đang dùng</MenuItem>
                    <MenuItem value="inactive">Ngưng</MenuItem>
                </TextField>
            </Stack>

            <Paper sx={{ mt: 1, display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1120 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Tên đơn vị</TableCell>
                            <TableCell>Tên chuyển khoản</TableCell>
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
                                <TableCell colSpan={8} align="center">
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                        <CircularProgress size={20} />
                                        <Typography variant="body2">Đang tải…</Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && filteredRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && filteredRows.map((r, idx) => (
                            <TableRow key={r.id} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography>
                                    <Typography variant="caption" color="error.main">
                                        CK: {r.tenChuyenKhoan || "Chưa nhập tên chuyển khoản"}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography sx={{ color: r.tenChuyenKhoan ? "text.primary" : "error.main", fontWeight: r.tenChuyenKhoan ? 500 : 700 }}>
                                        {r.tenChuyenKhoan || "Chưa nhập"}
                                    </Typography>
                                </TableCell>
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

            <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" }, mt: 1 }}>
                {loading && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={20} />
                            <Typography variant="body2">Đang tải…</Typography>
                        </Stack>
                    </Paper>
                )}
                {!loading && filteredRows.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>Không có dữ liệu</Paper>
                )}
                {!loading && filteredRows.map((r) => (
                    <Paper key={r.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2.5 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }} noWrap>{r.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>CK: {r.tenChuyenKhoan || "—"}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{r.stk || "—"}</Typography>
                                </Box>
                                <Chip size="small" label={r.TonTai ? "Đang dùng" : "Ngưng"} color={r.TonTai ? "success" : "default"} />
                            </Stack>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {r.maNganHang ? `${r.maNganHang}${r.tenNganHang ? ` - ${r.tenNganHang}` : ""}` : "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                Chi nhánh: {r.chiNhanhNganHang || "—"}
                            </Typography>
                            <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                                <IconButton size="small" onClick={() => openEdit(r)} aria-label="Sửa"><EditIcon fontSize="small" /></IconButton>
                                <IconButton size="small" color="error" onClick={() => askRemove(r)} aria-label="Xoá"><DeleteIcon fontSize="small" /></IconButton>
                            </Stack>
                        </Stack>
                    </Paper>
                ))}
            </Stack>

            {/* Dialog thêm/sửa */}
            <Dialog open={openEditDlg} onClose={() => setOpenEditDlg(false)} maxWidth="lg" fullWidth fullScreen={isMobile}>
                <DialogTitle>{editingId ? "Sửa đơn vị" : "Thêm đơn vị"}</DialogTitle>
                <DialogContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} mt={1} alignItems="flex-start">
                        <Stack spacing={2} sx={{ flex: 1, width: "100%", minWidth: 0 }}>
                            <TextField
                                autoFocus
                                label="Tên đơn vị (VD: Phòng Kế toán)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Tên chuyển khoản"
                                value={tenChuyenKhoan}
                                onChange={(e) => setTenChuyenKhoan(e.target.value)}
                                fullWidth
                                required
                                placeholder="Tên dùng ở cột Beneficiary Name khi chuyển tiền"
                                helperText="Xem hướng dẫn lấy tên chuyển khoản ở bên phải."
                                FormHelperTextProps={{ sx: { color: "text.secondary" } }}
                            />
                            <TextField
                                label="Số tài khoản (STK)"
                                value={stk}
                                onChange={(e) => setStk(e.target.value)}
                                fullWidth
                                required
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
                            />
                            <TextField
                                label="Chi nhánh ngân hàng (không bắt buộc)"
                                value={chiNhanhNH}
                                onChange={(e) => setChiNhanhNH(e.target.value)}
                                fullWidth
                                placeholder="VD: Chi nhánh Hà Nội"
                            />
                        </Stack>
                        <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
                            <BankTransferNameGuide />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDlg(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        onClick={save}
                        disabled={!name.trim() || !tenChuyenKhoan.trim() || !stk.trim() || !banks.some((bank) => bank.MaNganHang === maNH)}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog xác nhận xoá */}
            <Dialog open={!!confirming} onClose={() => setConfirming(null)} fullScreen={isMobile}>
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
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
    const filteredRows = useMemo(() => {
        const q = normalizeSearch(query.trim());
        return rows.filter((row) => {
            const okStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && row.TonTai) ||
                (statusFilter === "inactive" && !row.TonTai);
            const searchable = normalizeSearch([row.MaLoaiTien, row.TenLoaiTien].filter(Boolean).join(" "));
            return okStatus && (!q || searchable.includes(q));
        });
    }, [rows, query, statusFilter]);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">Admin · Loại tiền</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Thêm loại tiền</Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1 }}>
                <TextField
                    label="Tìm kiếm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Mã hoặc tên loại tiền"
                />
                <TextField
                    select
                    label="Trạng thái"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="active">Đang dùng</MenuItem>
                    <MenuItem value="inactive">Ngưng</MenuItem>
                </TextField>
            </Stack>
            <Paper sx={{ mt: 1, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead><TableRow><TableCell>Mã</TableCell><TableCell>Tên loại tiền</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
                    <TableBody>
                        {filteredRows.map((row) => (
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
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
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
    const filteredRows = useMemo(() => {
        const q = normalizeSearch(query.trim());
        return rows.filter((row) => {
            const okStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && row.TonTai) ||
                (statusFilter === "inactive" && !row.TonTai);
            const searchable = normalizeSearch([row.MaNganHang, row.TenNganHang].filter(Boolean).join(" "));
            return okStatus && (!q || searchable.includes(q));
        });
    }, [rows, query, statusFilter]);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5">Admin · Ngân hàng</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Thêm ngân hàng</Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1 }}>
                <TextField
                    label="Tìm kiếm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Mã hoặc tên ngân hàng"
                />
                <TextField
                    select
                    label="Trạng thái"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="active">Đang dùng</MenuItem>
                    <MenuItem value="inactive">Ngưng</MenuItem>
                </TextField>
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
                        {filteredRows.map((row) => (
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
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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

function ExpenseReviewerLookup() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [savingCode, setSavingCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [userRows, reviewerRows] = await Promise.all([
                api.listAssignableUsers(user?.id),
                api.listExpenseReviewers(user?.id),
            ]);
            setUsers(userRows || []);
            setAssignments(
                (reviewerRows || []).reduce((result, row) => {
                    if (!result[row.maLoaiChiPhi]) result[row.maLoaiChiPhi] = [];
                    result[row.maLoaiChiPhi].push(row.userId);
                    return result;
                }, {})
            );
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || "Không tải được cấu hình người phụ trách",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { load(); }, [load]);

    const save = async (maLoaiChiPhi) => {
        try {
            setSavingCode(maLoaiChiPhi);
            await api.replaceExpenseReviewers(
                maLoaiChiPhi,
                assignments[maLoaiChiPhi] || [],
                user?.id
            );
            setToast({ open: true, msg: "Đã lưu người phụ trách", type: "success" });
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || "Lưu người phụ trách thất bại",
                type: "error",
            });
        } finally {
            setSavingCode("");
        }
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 0.5 }}>Admin · Người phụ trách chi phí</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                Có người phụ trách thì phiếu sẽ qua bước xem trước KTT; để trống sẽ dùng luồng hiện tại.
            </Typography>
            <Stack spacing={1.5}>
                {Object.entries(EXPENSE_LABELS).map(([code, label]) => {
                    const selectedIds = assignments[code] || [];
                    const selectedUsers = users.filter((item) => selectedIds.includes(item.id));
                    return (
                        <Paper key={code} variant="outlined" sx={{ p: 2 }}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                                <Box sx={{ width: { md: 190 }, flexShrink: 0 }}>
                                    <Typography fontWeight={700}>{label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{code}</Typography>
                                </Box>
                                <Autocomplete
                                    multiple
                                    fullWidth
                                    loading={loading}
                                    options={users}
                                    value={selectedUsers}
                                    getOptionLabel={(option) => option.fullName || `User #${option.id}`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    onChange={(_, values) => {
                                        setAssignments((current) => ({
                                            ...current,
                                            [code]: values.map((item) => item.id),
                                        }));
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Người phụ trách" placeholder="Chọn tài khoản" />
                                    )}
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => save(code)}
                                    disabled={loading || savingCode === code}
                                    sx={{ minWidth: 100 }}
                                >
                                    {savingCode === code ? "Đang lưu..." : "Lưu"}
                                </Button>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((current) => ({ ...current, open: false }))}
            >
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}

export default function AdminSuppliers() {
    const { role, permissions = [] } = useAuth();
    const [tab, setTab] = useState(0);
    const isAdmin = role === "Admin" || permissions.includes("Admin");
    return (
        <Box>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
                <Tab label="Đơn vị hưởng thụ" />
                <Tab label="Loại tiền" />
                <Tab label="Ngân hàng" />
                {isAdmin && <Tab label="Người phụ trách chi phí" />}
            </Tabs>
            {tab === 0 && <SupplierLookup />}
            {tab === 1 && <CurrencyLookup />}
            {tab === 2 && <BankLookup />}
            {isAdmin && tab === 3 && <ExpenseReviewerLookup />}
        </Box>
    );
}
