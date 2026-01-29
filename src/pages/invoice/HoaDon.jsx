import React, { useEffect, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Stack, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Snackbar, Alert, MenuItem, Popover
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
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
    const filteredRows = React.useMemo(() => {
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
        <Box>
            {/* HEADER */}
            <Stack direction="row" justifyContent="space-between" mb={2}>
                <Typography variant="h5">Hóa đơn</Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="Từ ngày"
                            value={qFrom}
                            onChange={setQFrom}
                            slotProps={{ textField: { size: "small" } }}
                        />
                        <DatePicker
                            label="Đến ngày"
                            value={qTo}
                            onChange={setQTo}
                            slotProps={{ textField: { size: "small" } }}
                            minDate={qFrom || undefined}
                        />
                    </LocalizationProvider>

                    <Button
                        variant="text"
                        startIcon={<ClearIcon />}
                        onClick={() => {
                            setQFrom(null);
                            setQTo(null);
                        }}
                    >
                        Xoá ngày
                    </Button>
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Button startIcon={<RefreshIcon />} onClick={load}>
                        Tải lại
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
                        Tạo hóa đơn
                    </Button>
                </Stack>
            </Stack>

            {/* TABLE */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">STT</TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>Mã</span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setAnchorMa(e.currentTarget)}
                                        color={qMa ? "primary" : "default"}
                                    >
                                        <FilterListRoundedIcon fontSize="inherit" />
                                    </IconButton>
                                </Stack>

                                <Popover
                                    open={Boolean(anchorMa)}
                                    anchorEl={anchorMa}
                                    onClose={() => setAnchorMa(null)}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                >
                                    <Box p={1.5} width={260}>
                                        <TextField
                                            label="Mã hóa đơn"
                                            size="small"
                                            autoFocus
                                            value={qMa}
                                            onChange={(e) => setQMa(e.target.value)}
                                        />
                                    </Box>
                                </Popover>
                            </TableCell>
                            <TableCell align="center">Ngày</TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>Công ty</span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setAnchorCT(e.currentTarget)}
                                        color={qCongTy ? "primary" : "default"}
                                    >
                                        <FilterListRoundedIcon fontSize="inherit" />
                                    </IconButton>
                                </Stack>

                                <Popover
                                    open={Boolean(anchorCT)}
                                    anchorEl={anchorCT}
                                    onClose={() => setAnchorCT(null)}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                >
                                    <Box p={1.5} width={300}>
                                        <TextField
                                            label="Tên công ty"
                                            size="small"
                                            autoFocus
                                            value={qCongTy}
                                            onChange={(e) => setQCongTy(e.target.value)}
                                        />
                                    </Box>
                                </Popover>
                            </TableCell>
                            <TableCell align="right">Tổng tiền</TableCell>
                            <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                    <span>Trạng thái</span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setAnchorTT(e.currentTarget)}
                                        aria-label="Lọc theo Trạng thái"
                                        color={qTrangThai ? "primary" : "default"}
                                    >
                                        <FilterListRoundedIcon fontSize="inherit" />
                                    </IconButton>
                                </Stack>

                                <Popover
                                    open={Boolean(anchorTT)}
                                    anchorEl={anchorTT}
                                    onClose={() => setAnchorTT(null)}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                                    PaperProps={{ sx: { p: 1.5, width: 240 } }}
                                >
                                    <Stack spacing={1}>
                                        <TextField
                                            select
                                            label="Chọn trạng thái"
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
                                            {!!qTrangThai && (
                                                <Button
                                                    startIcon={<ClearIcon />}
                                                    size="small"
                                                    onClick={() => setQTrangThai("")}
                                                >
                                                    Xoá
                                                </Button>
                                            )}
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => setAnchorTT(null)}
                                            >
                                                OK
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Popover>
                            </TableCell>

                            <TableCell align="center">Duyệt</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRows.map((r, i) => (
                            <TableRow
                                key={r.hoaDonId}
                                hover
                                sx={{ cursor: "pointer" }}
                                onClick={() => openDetailDialog(r)}
                            >
                                <TableCell align="center">{i + 1}</TableCell>
                                <TableCell>{r.maHoaDon}</TableCell>
                                <TableCell align="center">{r.ngayDangKy}</TableCell>
                                <TableCell>{r.tenCongTy}</TableCell>
                                <TableCell align="right">{fmtMoney(r.tongThanhTien)}</TableCell>
                                <TableCell align="center">
                                    <StatusChip status={r.maTrangThai} />
                                </TableCell>
                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                    <IconButton
                                        color="success"
                                        disabled={!canAct(r)}
                                        onClick={(e) => handleApprove(r, true, e)}
                                    >
                                        <CheckCircleIcon />
                                    </IconButton>

                                    <IconButton
                                        color="error"
                                        disabled={!canApprove(r)}   // Reject chỉ cho role duyệt
                                        onClick={(e) => handleApprove(r, false, e)}
                                    >
                                        <CancelIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography align="center" color="text.secondary">
                                        Không có hóa đơn
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>

            {/* CREATE DIALOG */}
            <Dialog
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Tạo hóa đơn
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Nhập thông tin công ty và ghi chú cho hóa đơn
                            </Typography>
                        </Box>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3} mt={1}>
                        {/* ===== CÔNG TY ===== */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ mb: 1 }}
                            >
                                Thông tin công ty
                            </Typography>

                            {/* Autocomplete + nút + */}
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <Autocomplete
                                    sx={{ flex: 1 }}
                                    options={companies}
                                    value={companies.find(c => c.id === form.congTyId) || null}
                                    onChange={(_, val) =>
                                        setForm({ ...form, congTyId: val?.id ?? "" })
                                    }
                                    inputValue={congTyInput}
                                    onInputChange={(_, val) => setCongTyInput(val)}
                                    getOptionLabel={(o) => o?.name ?? ""}
                                    isOptionEqualToValue={(o, v) => o?.id === v?.id}
                                    filterOptions={(options, { inputValue }) => {
                                        const q = stripVN(inputValue.toLowerCase().trim());
                                        if (!q) return options;
                                        return options.filter(o =>
                                            stripVN(o.name.toLowerCase()).includes(q)
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Công ty"
                                            placeholder="Gõ tên công ty (không dấu)…"
                                            helperText="Nhập vài ký tự để tìm gần đúng"
                                        />
                                    )}
                                    ListboxProps={{ style: { maxHeight: 300 } }}
                                />
                                <IconButton
                                    onClick={() => setOpenAddCT(true)}
                                    sx={{
                                        mt: 0.5,
                                        width: 56,
                                        height: 56,
                                        borderRadius: "50%",
                                        border: "1px dashed",
                                        borderColor: "primary.main",
                                        color: "primary.main",
                                        "&:hover": {
                                            bgcolor: "primary.main",
                                            color: "white",
                                        },
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Stack>
                        </Box>

                        {/* ===== GHI CHÚ ===== */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ mb: 1 }}
                            >
                                Ghi chú
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                placeholder="Nhập ghi chú (nếu có)…"
                                value={form.ghiChu}
                                onChange={(e) =>
                                    setForm({ ...form, ghiChu: e.target.value })
                                }
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>Đóng</Button>
                    <Button variant="contained" onClick={submitCreate}>
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DETAIL DIALOG */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="lg" fullWidth>
                {detail && (
                    <>
                        <DialogTitle>Chi tiết hóa đơn {detail.maHoaDon}</DialogTitle>
                        <DialogContent>
                            <HoaDonChiTiet
                                hoaDonId={detail.hoaDonId}
                                rows={items}
                                locked={!(
                                    (role === "NhanVien" && detail.maTrangThai === "KhoiTao") ||
                                    detail.maTrangThai === "ChoDuyet_TBP"
                                )}
                                onReload={async () => {
                                    const list = await apiInvoice.getChiTiet(detail.hoaDonId);
                                    setItems(list);
                                    await apiInvoice.saveHoaDon(detail.hoaDonId);
                                    await load();
                                }}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
            <Dialog
                open={openAddCT}
                onClose={() => setOpenAddCT(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Thêm công ty</DialogTitle>

                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            autoFocus
                            label="Tên công ty"
                            value={ctName}
                            onChange={(e) => setCtName(e.target.value)}
                            fullWidth
                        />

                        <TextField
                            label="Mã số thuế"
                            value={ctMaSoThue}
                            onChange={(e) => setCtMaSoThue(e.target.value)}
                            fullWidth
                        />

                        <TextField
                            label="Địa chỉ"
                            value={ctDiaChi}
                            onChange={(e) => setCtDiaChi(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="VD: Số 76, đường ABC, Quận XYZ, Hà Nội"
                        />
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenAddCT(false)}>
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        disabled={savingCT}
                        onClick={saveCongTy}
                    >
                        {savingCT ? "Đang lưu..." : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert severity={toast.type} variant="filled">
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
