import React, { useEffect, useState, useMemo } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Stack, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Snackbar, Alert, MenuItem, Popover,
    Card, CardContent, CardHeader, Divider, Tooltip, Chip, Avatar, InputAdornment,
    TableContainer
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import Autocomplete from "@mui/material/Autocomplete";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import StatusChip from "../../components/StatusChip";
import HoaDonChiTiet from "./HoaDonChiTiet";
import { apiInvoice } from "../../lib/api_invoice";
import { useAuth } from "../../store/useAuth";

const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("vi-VN");
};

export default function HoaDon() {
    const { role, user } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [detail, setDetail] = useState(null);
    const [items, setItems] = useState([]);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const [form, setForm] = useState({
        congTyId: "",
        ghiChu: "",
    });
    // autocomplete
    const [congTyInput, setCongTyInput] = useState("");

    // dialog thêm công ty
    const [openAddCT, setOpenAddCT] = useState(false);
    const [ctName, setCtName] = useState("");
    const [ctDiaChi, setCtDiaChi] = useState("");
    const [ctMaSoThue, setCtMaSoThue] = useState("");
    const [savingCT, setSavingCT] = useState(false);
    const [companies, setCompanies] = useState([]);

    // ===== FILTER =====
    const [qMa, setQMa] = useState("");
    const [qCongTy, setQCongTy] = useState("");
    const [qFrom, setQFrom] = useState(null);
    const [qTo, setQTo] = useState(null);
    const [qTrangThai, setQTrangThai] = useState("");

    // popover anchor
    const [anchorMa, setAnchorMa] = useState(null);
    const [anchorCT, setAnchorCT] = useState(null);
    const [anchorTT, setAnchorTT] = useState(null);
    const stripVN = (s = "") =>
        s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
    const filteredRows = useMemo(() => {
        if (!rows) return [];

        const hasMa = qMa.trim() !== "";
        const hasCT = qCongTy.trim() !== "";
        const hasFrom = !!qFrom;
        const hasTo = !!qTo;

        const qMaNorm = stripVN(qMa.toLowerCase().trim());
        const qCTNorm = stripVN(qCongTy.toLowerCase().trim());

        return rows.filter(r => {
            // ===== Mã =====
            let okMa = true;
            if (hasMa) {
                okMa = stripVN(String(r.maHoaDon || "").toLowerCase()).includes(qMaNorm);
            }

            // ===== Công ty =====
            let okCT = true;
            if (hasCT) {
                okCT = stripVN(String(r.tenCongTy || "").toLowerCase()).includes(qCTNorm);
            }

            // ===== Ngày =====
            let okDate = true;
            if (hasFrom || hasTo) {
                const d = new Date(r.ngayDangKy);
                if (isNaN(d.getTime())) return false;

                const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                if (hasFrom && day < qFrom.startOf("day").valueOf()) okDate = false;
                if (hasTo && day > qTo.startOf("day").valueOf()) okDate = false;
            }

            // ===== Trạng thái =====
            let okTT = true;
            if (qTrangThai) {
                okTT = r.maTrangThai === qTrangThai;
            }

            return okMa && okCT && okDate && okTT;
        });
    }, [rows, qMa, qCongTy, qFrom, qTo, qTrangThai]);


    useEffect(() => {
        apiInvoice
            .listCongTy({ tonTai: 1 })
            .then(setCompanies)
            .catch(() =>
                setToast({ open: true, msg: "Lỗi tải công ty", type: "error" })
            );
    }, []);

    /* ================= LOAD LIST ================= */
    const load = async () => {
        try {
            setLoading(true);
            const data = await apiInvoice.listHoaDon({
                userId: user?.id,
                roleCode: role,
                idDonVi: user?.idDonVi,
            });
            setRows(data || []);
            console.log(user, role);
            console.log("Loaded invoices:", data);
        } catch {
            setToast({ open: true, msg: "Lỗi tải danh sách hóa đơn", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, []);

    /* ================= DUYỆT ================= */
    const canApprove = (r) =>
        (role === "TBP" && r.maTrangThai === "ChoDuyet_TBP") ||
        (role === "KTT" && r.maTrangThai === "ChoDuyet_KTT") ||
        (role === "GD" && r.maTrangThai === "ChoDuyet_GD");

    const canSubmit = (r) =>
        role === "NhanVien" && r.maTrangThai === "KhoiTao";
    const canAct = (r) => {
        // ⛔ trạng thái kết thúc
        if (r.maTrangThai === "HoanThanh") return false;

        // Nhân viên trình
        if (canSubmit(r)) return true;

        // TBP / KTT / GD duyệt
        if (canApprove(r)) return true;

        return false;
    };

    const handleApprove = async (row, agree, e) => {
        e.stopPropagation();
        try {
            const updated = await apiInvoice.approveHoaDon(
                row.hoaDonId,
                agree,
                role,
                user
            );

            setRows((r) =>
                r.map((x) => (x.hoaDonId === updated.hoaDonId ? updated : x))
            );
            setDetail((d) =>
                d && d.hoaDonId === updated.hoaDonId ? updated : d
            );

            setToast({
                open: true,
                msg: agree ? "Đã duyệt hóa đơn" : "Đã từ chối hóa đơn",
                type: "success",
            });
        } catch (err) {
            setToast({
                open: true,
                msg:
                    err?.response?.data?.message ||
                    "Duyệt thất bại",
                type: "error",
            });
        }
    };

    /* ================= CREATE ================= */
    const submitCreate = async () => {
        try {
            if (!form.congTyId) throw new Error("Chưa chọn công ty");

            await apiInvoice.createHoaDon({
                ngayDangKy: new Date().toISOString().slice(0, 10),
                congTyId: form.congTyId,
                nguoiDangKyId: user.id,
                donViNguoiDangKyId: user.idDonVi,
                ghiChu: form.ghiChu,
            });

            setOpenCreate(false);
            setForm({ congTyId: "", ghiChu: "" });
            await load();

            setToast({ open: true, msg: "Đã tạo hóa đơn", type: "success" });
        } catch (e) {
            setToast({
                open: true,
                msg: e.message || "Lỗi tạo hóa đơn",
                type: "error",
            });
        }
    };

    const saveCongTy = async () => {
        if (!ctName.trim()) {
            setToast({
                open: true,
                msg: "Tên công ty không được để trống",
                type: "error",
            });
            return;
        }

        try {
            setSavingCT(true);

            const created = await apiInvoice.createCongTy({
                name: ctName.trim(),
                maSoThue: ctMaSoThue || null,
                diaChi: ctDiaChi || null,
            });

            setCtName("");
            setCtMaSoThue("");
            setCtDiaChi("");
            // thêm vào list + chọn luôn
            setCompanies(list => [...list, created]);
            setForm(f => ({ ...f, congTyId: created.id }));

            setOpenAddCT(false);
            setToast({ open: true, msg: "Đã thêm công ty", type: "success" });
        } catch (e) {
            setToast({
                open: true,
                msg: e?.response?.data?.message || "Thêm công ty thất bại",
                type: "error",
            });
        } finally {
            setSavingCT(false);
        }
    };

    /* ================= DETAIL ================= */
    const openDetailDialog = async (row) => {
        setDetail(row);
        setOpenDetail(true);
        const list = await apiInvoice.getChiTiet(row.hoaDonId);
        setItems(list || []);
    };


    return (
        <Box sx={{ p: 2 }}>
            <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
                {/* HEADERS */}
                <CardHeader
                    title={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    bgcolor: "primary.main",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    mr: 1
                                }}
                            >
                                <Typography variant="h6" fontWeight="bold">HĐ</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={700} color="text.primary">
                                    Quản lý Hóa đơn
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Danh sách và quản lý hóa đơn, phiếu yêu cầu
                                </Typography>
                            </Box>
                        </Stack>
                    }
                    action={
                        <Stack direction="row" spacing={1} sx={{ mt: 1, mr: 1 }}>
                            <Tooltip title="Tải lại dữ liệu">
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<RefreshIcon />}
                                    onClick={load}
                                    size="small"
                                    sx={{ textTransform: "none", borderRadius: 2 }}
                                >
                                    Tải lại
                                </Button>
                            </Tooltip>
                            <Tooltip title="Tạo hóa đơn mới">
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenCreate(true)}
                                    size="small"
                                    sx={{
                                        textTransform: "none",
                                        borderRadius: 2,
                                        boxShadow: 2,
                                        background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)"
                                    }}
                                >
                                    Tạo mới
                                </Button>
                            </Tooltip>
                        </Stack>
                    }
                    sx={{
                        borderBottom: "1px solid #eee",
                        bgcolor: "#fff",
                        px: 3,
                        py: 2
                    }}
                />

                <Box sx={{ px: 3, py: 2, bgcolor: "#fafafa" }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <FilterAltIcon color="action" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Bộ lọc:</Typography>
                        </Stack>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="Từ ngày"
                                value={qFrom}
                                onChange={setQFrom}
                                slotProps={{
                                    textField: {
                                        size: "small",
                                        sx: { bgcolor: "white", minWidth: 150 }
                                    }
                                }}
                            />
                            <DatePicker
                                label="Đến ngày"
                                value={qTo}
                                onChange={setQTo}
                                slotProps={{
                                    textField: {
                                        size: "small",
                                        sx: { bgcolor: "white", minWidth: 150 }
                                    }
                                }}
                                minDate={qFrom || undefined}
                            />
                        </LocalizationProvider>

                        {(qFrom || qTo) && (
                            <Tooltip title="Xóa bộ lọc ngày">
                                <Button
                                    variant="text"
                                    color="error"
                                    startIcon={<ClearIcon />}
                                    onClick={() => {
                                        setQFrom(null);
                                        setQTo(null);
                                    }}
                                    size="small"
                                    sx={{ textTransform: "none" }}
                                >
                                    Xoá ngày
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>

                <Divider />

                {/* TABLE */}
                <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <Table size="medium" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Mã HĐ</span>
                                        <Tooltip title="Tìm kiếm theo mã">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setAnchorMa(e.currentTarget)}
                                                color={qMa ? "primary" : "default"}
                                            >
                                                <SearchIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Popover
                                        open={Boolean(anchorMa)}
                                        anchorEl={anchorMa}
                                        onClose={() => setAnchorMa(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 260, borderRadius: 2, boxShadow: 3 } }}
                                    >
                                        <TextField
                                            label="Tìm mã hóa đơn..."
                                            size="small"
                                            autoFocus
                                            fullWidth
                                            value={qMa}
                                            onChange={(e) => setQMa(e.target.value)}
                                            InputProps={{
                                                endAdornment: qMa && (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setQMa("")}><ClearIcon fontSize="small" /></IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Popover>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>Ngày tạo</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Công ty</span>
                                        <Tooltip title="Tìm kiếm theo tên công ty">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setAnchorCT(e.currentTarget)}
                                                color={qCongTy ? "primary" : "default"}
                                            >
                                                <SearchIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Popover
                                        open={Boolean(anchorCT)}
                                        anchorEl={anchorCT}
                                        onClose={() => setAnchorCT(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 300, borderRadius: 2, boxShadow: 3 } }}
                                    >
                                        <TextField
                                            label="Tìm tên công ty..."
                                            size="small"
                                            autoFocus
                                            fullWidth
                                            value={qCongTy}
                                            onChange={(e) => setQCongTy(e.target.value)}
                                            InputProps={{
                                                endAdornment: qCongTy && (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setQCongTy("")}><ClearIcon fontSize="small" /></IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Popover>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>Người tạo</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>Đơn vị</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>Tổng tiền</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555", minWidth: 200 }}>Ghi chú</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555", whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                        <span>Trạng thái</span>
                                        <Tooltip title="Lọc theo trạng thái">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setAnchorTT(e.currentTarget)}
                                                color={qTrangThai ? "primary" : "default"}
                                            >
                                                <FilterListRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Popover
                                        open={Boolean(anchorTT)}
                                        anchorEl={anchorTT}
                                        onClose={() => setAnchorTT(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 240, borderRadius: 2, boxShadow: 3 } }}
                                    >
                                        <Stack spacing={2}>
                                            <TextField
                                                select
                                                label="Lọc trạng thái"
                                                value={qTrangThai}
                                                onChange={(e) => setQTrangThai(e.target.value)}
                                                size="small"
                                                fullWidth
                                            >
                                                <MenuItem value="">Tất cả</MenuItem>
                                                <MenuItem value="ChoDuyet_TBP">Chờ duyệt TBP</MenuItem>
                                                <MenuItem value="ChoDuyet_KTT">Chờ duyệt KTT</MenuItem>
                                                <MenuItem value="ChoDuyet_GD">Chờ duyệt GD</MenuItem>
                                                <MenuItem value="HoanThanh">Hoàn thành</MenuItem>
                                                <MenuItem value="TuChoi">Từ chối</MenuItem>
                                            </TextField>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" onClick={() => setQTrangThai("")}>Xóa</Button>
                                                <Button variant="contained" size="small" onClick={() => setAnchorTT(null)}>OK</Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>

                                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#f5f5f5", color: "#555" }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRows.map((r, i) => (
                                <TableRow
                                    key={r.hoaDonId}
                                    hover
                                    sx={{
                                        cursor: "pointer",
                                        "&:hover": { bgcolor: "#f0f7ff !important" },
                                        transition: "background-color 0.2s"
                                    }}
                                    onClick={() => openDetailDialog(r)}
                                >
                                    <TableCell align="center" sx={{ color: "text.secondary" }}>{i + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 500, color: "primary.main" }}>{r.maHoaDon}</TableCell>
                                    <TableCell align="center">{fmtDate(r.ngayDangKy)}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{r.tenCongTy}</TableCell>
                                    <TableCell>{r.tenNguoiTao || "—"}</TableCell>
                                    <TableCell>{r.tenDonViNguoiTao || "—"}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                                        {fmtMoney(r.tongThanhTien)}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={r.ghiChu || ""}>
                                            <Typography variant="body2" sx={{
                                                maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "text.secondary"
                                            }}>
                                                {r.ghiChu || "—"}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>

                                    <TableCell align="center">
                                        <StatusChip status={r.maTrangThai} />
                                    </TableCell>
                                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0} justifyContent="center">
                                            <Tooltip title="Duyệt / Trình">
                                                <span>
                                                    <IconButton
                                                        color="success"
                                                        disabled={!canAct(r)}
                                                        onClick={(e) => handleApprove(r, true, e)}
                                                        size="small"
                                                    >
                                                        <CheckCircleIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="Từ chối">
                                                <span>
                                                    <IconButton
                                                        color="error"
                                                        disabled={!canApprove(r)}
                                                        onClick={(e) => handleApprove(r, false, e)}
                                                        size="small"
                                                    >
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {rows.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={10}>
                                        <Box sx={{ py: 8, textAlign: "center" }}>
                                            <Typography variant="body1" color="text.secondary">
                                                Chưa có dữ liệu hóa đơn nào.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* CREATE DIALOG */}
            <Dialog
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, boxShadow: 6 }
                }}
            >
                <DialogTitle sx={{ bgcolor: "#fafafa", borderBottom: "1px solid #eee", pb: 2 }}>
                    <Typography variant="h6" fontWeight={700} component="div">
                        Tạo hóa đơn mới
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                        Nhập thông tin công ty và ghi chú
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ mt: 2 }}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom sx={{ color: "text.primary", fontWeight: 600 }}>
                                Công ty đối tác <span style={{ color: "red" }}>*</span>
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Autocomplete
                                    sx={{ flex: 1 }}
                                    options={companies}
                                    value={companies.find(c => c.id === form.congTyId) || null}
                                    onChange={(_, val) => setForm({ ...form, congTyId: val?.id ?? "" })}
                                    inputValue={congTyInput}
                                    onInputChange={(_, val) => setCongTyInput(val)}
                                    getOptionLabel={(o) => o?.name ?? ""}
                                    isOptionEqualToValue={(o, v) => o?.id === v?.id}
                                    filterOptions={(options, { inputValue }) => {
                                        const q = stripVN(inputValue.toLowerCase().trim());
                                        if (!q) return options;
                                        return options.filter(o => stripVN(o.name.toLowerCase()).includes(q));
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} placeholder="Tìm công ty..." size="medium" />
                                    )}
                                    ListboxProps={{ style: { maxHeight: 250 } }}
                                />
                                <Tooltip title="Thêm công ty mới">
                                    <Button
                                        variant="outlined"
                                        sx={{ height: 56, minWidth: 56, borderRadius: 2 }}
                                        onClick={() => setOpenAddCT(true)}
                                    >
                                        <AddIcon />
                                    </Button>
                                </Tooltip>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom sx={{ color: "text.primary", fontWeight: 600 }}>
                                Ghi chú
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                placeholder="Nhập ghi chú chi tiết..."
                                value={form.ghiChu}
                                onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: "1px solid #eee" }}>
                    <Button onClick={() => setOpenCreate(false)} color="inherit" sx={{ borderRadius: 2 }}>Hủy bỏ</Button>
                    <Button variant="contained" onClick={submitCreate} sx={{ borderRadius: 2, px: 3 }}>
                        Lưu Hóa Đơn
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DETAIL DIALOG */}
            <Dialog
                open={openDetail}
                onClose={() => setOpenDetail(false)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, minHeight: "60vh" }
                }}
            >
                {detail && (
                    <>
                        <DialogTitle sx={{ bgcolor: "#fafafa", borderBottom: "1px solid #eee", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700} component="div">
                                    Chi tiết hóa đơn: <span style={{ color: "#1976d2" }}>{detail.maHoaDon}</span>
                                </Typography>
                                <Typography variant="body2" color="text.secondary" component="div">
                                    {detail.tenCongTy}
                                </Typography>
                            </Box>
                            <Tooltip title="Đóng">
                                <IconButton onClick={() => setOpenDetail(false)}>
                                    <ClearIcon />
                                </IconButton>
                            </Tooltip>
                        </DialogTitle>
                        <DialogContent sx={{ p: 0, bgcolor: "#f5f7fa" }}>
                            <Box sx={{ p: 2 }}>
                                <HoaDonChiTiet
                                    hoaDonId={detail.hoaDonId}
                                    rows={items}
                                    locked={!((role === "NhanVien" && detail.maTrangThai === "KhoiTao"))}
                                    onReload={async () => {
                                        const list = await apiInvoice.getChiTiet(detail.hoaDonId);
                                        setItems(list);
                                        await apiInvoice.saveHoaDon(detail.hoaDonId);
                                        await load();
                                    }}
                                />
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* ADD COMPANY DIALOG */}
            <Dialog
                open={openAddCT}
                onClose={() => setOpenAddCT(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle>Thêm công ty đối tác</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            autoFocus
                            label="Tên công ty"
                            value={ctName}
                            onChange={(e) => setCtName(e.target.value)}
                            fullWidth
                            variant="outlined"
                        />
                        <TextField
                            label="Mã số thuế"
                            value={ctMaSoThue}
                            onChange={(e) => setCtMaSoThue(e.target.value)}
                            fullWidth
                            variant="outlined"
                        />
                        <TextField
                            label="Địa chỉ"
                            value={ctDiaChi}
                            onChange={(e) => setCtDiaChi(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            variant="outlined"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddCT(false)}>Hủy</Button>
                    <Button variant="contained" disabled={savingCT} onClick={saveCongTy}>
                        {savingCT ? "Đang lưu..." : "Lưu Công Ty"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert severity={toast.type} variant="filled" sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
