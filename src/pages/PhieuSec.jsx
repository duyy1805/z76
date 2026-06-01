import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Tooltip, IconButton, Snackbar, Alert, Grid, Popover, MenuItem, FormControl, InputLabel, Select
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import ClearIcon from "@mui/icons-material/Clear";
import StatusChip from "../components/StatusChip";
import Autocomplete from "@mui/material/Autocomplete";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";


import { NumericFormat } from "react-number-format";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";

const fmtMoney = (n) => (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 4 });

const isoToDisplay = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "—";

    // Giữ nguyên giờ từ server (UTC)
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const z = (x) => String(x).padStart(2, "0");
    return `${z(local.getDate())}/${z(local.getMonth() + 1)}/${local.getFullYear()} ${z(local.getHours())}:${z(local.getMinutes())}`;
};

// bỏ dấu để tìm không dấu
const stripVN = (s = "") =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const logSoSec = (...args) => console.log("[SoSec][PhieuSec]", ...args);

export default function PhieuSec() {
    const { role, user } = useAuth();

    // dữ liệu chính
    const [rows, setRows] = useState(null);
    const [donvis, setDonvis] = useState([]);

    // dialog tạo / detail
    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [donviInput, setDonviInput] = useState("");
    // toast
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    // dialog thêm đơn vị
    const [openAddDv, setOpenAddDv] = useState(false);
    const [dvName, setDvName] = useState("");
    const [dvStk, setDvStk] = useState("");
    const [dvMaNH, setDvMaNH] = useState("");
    const [savingDv, setSavingDv] = useState(false);
    // form tạo
    const [form, setForm] = useState({
        noiDung: "",
        donViId: 1,
        soTien: 0,
        nguoiDangKyId: user?.id || null,
        ghiChu: "",
    });

    // nhập lệnh chi
    const [newLenhChi, setNewLenhChi] = useState("");
    const [savingLC, setSavingLC] = useState(false);

    // filter (client)
    const [qMa, setQMa] = useState("");
    const [qNoiDung, setQNoiDung] = useState("");
    const [qDonVi, setQDonVi] = useState(""); // text input cho đơn vị
    const [qFrom, setQFrom] = useState(null); // dayjs | null
    const [qTo, setQTo] = useState(null);     // dayjs | null
    const [qTrangThai, setQTrangThai] = useState("");
    const [anchorTrangThai, setAnchorTrangThai] = useState(null);
    // anchor Popover cho từng cột
    const [anchorMa, setAnchorMa] = useState(null);
    const [anchorNoiDung, setAnchorNoiDung] = useState(null);
    const [anchorDonVi, setAnchorDonVi] = useState(null);

    // Tài liệu đính kèm
    const [attachList, setAttachList] = useState([]);         // danh sách tài liệu của phiếu
    const [attachLoading, setAttachLoading] = useState(false);
    const [attachUploading, setAttachUploading] = useState(false);
    const [attachFiles, setAttachFiles] = useState([]);       // mảng File đã chọn

    // Preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewTitle, setPreviewTitle] = useState("");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // lưu file cần xoá

    const canAddLenhChi =
        detail && detail.trangThai === "HoanThanh" && !detail.maLenhChi && (role === "KTT" || role === "GD");

    const load = async () => {
        const params = {
            userId: user?.id,
            roleCode: role,      // "NhanVien" | "TBP" | "KTT" | "GD"
            idDonVi: user?.idDonVi,
        };

        logSoSec("load:listPhieu params", params, {
            user,
            localStorageAuth: localStorage.getItem("z76_auth_sos"),
            sessionStorageAuth: sessionStorage.getItem("z76_auth_sos_ss"),
        });

        const p = await api.listPhieu(params);
        logSoSec("load:listPhieu result", {
            count: p?.length ?? 0,
            ids: (p || []).map((x) => x.id),
            idDonVis: [...new Set((p || []).map((x) => x.idDonVi).filter(Boolean))],
            statusCounts: (p || []).reduce((acc, x) => {
                acc[x.trangThai || "unknown"] = (acc[x.trangThai || "unknown"] || 0) + 1;
                return acc;
            }, {}),
            sample: (p || []).slice(0, 5),
        });

        const dv = await api.listDonVi();
        logSoSec("load:listDonVi result", { count: dv?.length ?? 0 });
        setRows(p);
        setDonvis(dv);
        setForm((f) => ({ ...f, donViId: dv?.[0]?.id ?? 1 }));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const canApprove = (p) =>
        (role === "TBP" && p.trangThai === "ChoDuyet_TBP") ||
        (role === "KTT" && p.trangThai === "ChoDuyet_KTT") ||
        (role === "GD" && p.trangThai === "ChoDuyet_GD");

    const handleApprove = async (p, agree, e) => {
        e?.stopPropagation();
        try {
            logSoSec("approve:before", {
                phieuId: p?.id,
                phieuIdDonVi: p?.idDonVi,
                trangThai: p?.trangThai,
                agree,
                role,
                userId: user?.id,
                userIdDonVi: user?.idDonVi,
                canApprove: canApprove(p),
            });
            if (!canApprove(p)) throw new Error("Bạn không có quyền duyệt ở bước này");
            const updated = await api.approve(p.id, role, agree, user);
            logSoSec("approve:after", updated);
            setRows((r) => (r ? r.map((x) => (x.id === updated.id ? updated : x)) : r));
            setDetail((d) => (d && d.id === updated.id ? updated : d));
            setToast({ open: true, msg: agree ? "Đã duyệt" : "Đã từ chối", type: "success" });
        } catch (e) {
            logSoSec("approve:error", e?.response?.data || e);
            setToast({ open: true, msg: e.message ?? "Lỗi duyệt phiếu", type: "error" });
        }
    };

    const submitCreate = async () => {
        try {
            if (!form.noiDung.trim()) throw new Error("Nhập nội dung");
            if (!form.soTien || Number(form.soTien) <= 0) throw new Error("Số tiền > 0");

            const payload = {
                ngay: new Date().toISOString().slice(0, 10),
                noiDung: form.noiDung,
                donViId: form.donViId,
                soTien: Number(form.soTien),
                nguoiDangKyId: user?.id,
                idDonVi: user?.idDonVi,
                ghiChu: form.ghiChu,
            };

            logSoSec("create:payload", payload, { role, user });
            const created = await api.createPhieu(payload);
            logSoSec("create:result", created);

            setOpenCreate(false);
            setForm({
                noiDung: "",
                donViId: donvis[0]?.id || 1,
                soTien: 0,
                nguoiDangKyId: user?.id || null,
                ghiChu: "",
            });
            await load();
            setToast({ open: true, msg: "Đã tạo phiếu", type: "success" });
        } catch (e) {
            setToast({ open: true, msg: e.message ?? "Lỗi tạo phiếu", type: "error" });
        }
    };

    const openAddDonVi = () => {
        setDvName("");
        setDvStk("");
        setDvMaNH("");
        setOpenAddDv(true);
    };

    const saveDonVi = async () => {
        const n = dvName.trim();
        const s = dvStk?.trim() || null;
        const m = dvMaNH?.trim() || null;
        if (!n) {
            setToast({ open: true, msg: "Tên đơn vị không được để trống", type: "error" });
            return;
        }
        try {
            setSavingDv(true);
            const created = await api.createDonVi({ name: n, stk: s, maNganHang: m }); // { id, name, ... }
            // cập nhật danh sách + chọn ngay đơn vị mới
            setDonvis((list) => {
                const next = [...(list || []), created];
                return next.sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
            });
            setForm((f) => ({ ...f, donViId: created.id }));
            setOpenAddDv(false);
            setToast({ open: true, msg: "Đã thêm đơn vị", type: "success" });
        } catch (err) {
            const msg = err?.response?.data?.message || "Lưu đơn vị thất bại";
            setToast({ open: true, msg, type: "error" });
        } finally {
            setSavingDv(false);
        }
    };
    const saveLenhChi = async () => {
        if (!newLenhChi.trim()) {
            setToast({ open: true, msg: "Nhập mã lệnh chi", type: "warning" });
            return;
        }
        try {
            setSavingLC(true);
            await api.createLenhChi(detail.id, {
                maLenhChi: newLenhChi.trim(),
                nguoiNhapId: user?.id,
            });

            // refresh record
            let fresh = null;
            if (typeof api.getPhieuById === "function") {
                fresh = await api.getPhieuById(detail.id, {
                    userId: user?.id,
                    roleCode: role,        // "NhanVien" | "TBP" | "KTT" | "GD"
                    idDonVi: user?.idDonVi,
                });
            } else {
                fresh = { ...detail, maLenhChi: newLenhChi.trim() };
            }

            setDetail(fresh);
            setRows((r) => r?.map((x) => (x.id === detail.id ? { ...x, maLenhChi: fresh.maLenhChi } : x)));
            setNewLenhChi("");
            setToast({ open: true, msg: "Đã tạo lệnh chi", type: "success" });
        } catch (e) {
            setToast({
                open: true,
                msg: e?.response?.data?.message || e.message || "Lỗi tạo lệnh chi",
                type: "error",
            });
        } finally {
            setSavingLC(false);
        }
    };

    const openDetailDialog = async (row) => {
        logSoSec("detail:open row", {
            phieuId: row?.id,
            maSoSec: row?.maSoSec,
            phieuIdDonVi: row?.idDonVi,
            role,
            userId: user?.id,
            userIdDonVi: user?.idDonVi,
        });
        setDetail(row);
        setOpenDetail(true);

        // load tài liệu theo phiếu
        loadAttachments(row.id);

        if (typeof api.getPhieuById === "function") {
            try {
                setDetailLoading(true);
                const fresh = await api.getPhieuById(row.id, {
                    userId: user?.id,
                    roleCode: role,
                    idDonVi: user?.idDonVi,
                });
                logSoSec("detail:fresh", fresh);
                setDetail(fresh);
            } catch {
                // ignore
            } finally {
                setDetailLoading(false);
            }
        }
    };

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    };

    // Lọc client theo 3 trường: Mã, Nội dung, Đơn vị (tên)
    const filteredRows = useMemo(() => {
        if (!rows) return null;

        const hasMa = qMa.trim() !== "";
        const hasNd = qNoiDung.trim() !== "";
        const hasDv = qDonVi.trim() !== "";
        const hasFrom = !!qFrom;
        const hasTo = !!qTo;

        const qMaNorm = stripVN(qMa.trim().toLowerCase());
        const qNdNorm = stripVN(qNoiDung.trim().toLowerCase());
        const qDvNorm = stripVN(qDonVi.trim().toLowerCase());

        return rows.filter((r) => {
            // Ngày (so sánh theo ngày, bỏ giờ)
            let okDate = true;
            if (hasFrom || hasTo) {
                const rowDate = dayjs(r.ngay);
                if (rowDate.isValid()) {
                    const rowVal = rowDate.startOf("day").valueOf();
                    if (hasFrom) okDate = okDate && rowVal >= qFrom.startOf("day").valueOf();
                    if (hasTo) okDate = okDate && rowVal <= qTo.startOf("day").valueOf();
                } else {
                    okDate = false;
                }
            }
            // Trạng thái
            let okStatus = true;
            if (qTrangThai) {
                okStatus = r.trangThai === qTrangThai;
            }
            // Mã
            let okMa = true;
            if (hasMa) {
                const ma = r.maSoSec || `SS-${r.id}`;
                okMa = stripVN(String(ma).toLowerCase()).includes(qMaNorm);
            }

            // Nội dung
            let okNd = true;
            if (hasNd) {
                okNd = stripVN(String(r.noiDung || "").toLowerCase()).includes(qNdNorm);
            }

            // Đơn vị
            let okDv = true;
            if (hasDv) {
                const dvName = donvis.find((d) => d.id === r.donViId)?.name || String(r.donViId || "");
                okDv = stripVN(dvName.toLowerCase()).includes(qDvNorm);
            }

            return okDate && okStatus && okMa && okNd && okDv;
        });
    }, [rows, qMa, qNoiDung, qDonVi, qFrom, qTo, qTrangThai, donvis]);


    // clear từng filter
    const clearFilter = (key) => {
        if (key === "ma") setQMa("");
        if (key === "nd") setQNoiDung("");
        if (key === "dv") setQDonVi("");
    };

    const loadAttachments = async (phieuSecId) => {
        if (!phieuSecId) return;
        try {
            setAttachLoading(true);
            const list = await api.listTaiLieuPhieuSec(phieuSecId); // API mới
            setAttachList(list || []);
        } catch (e) {
            console.error(e);
            setToast({
                open: true,
                msg: e?.response?.data?.message || "Lỗi tải tài liệu",
                type: "error",
            });
        } finally {
            setAttachLoading(false);
        }
    };

    const handleAttachFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setAttachFiles(files);
    };

    const handleUploadAttachments = async () => {
        if (!detail?.id) {
            setToast({ open: true, msg: "Chưa có phiếu để gắn tài liệu", type: "warning" });
            return;
        }
        if (!attachFiles.length) {
            setToast({ open: true, msg: "Chọn ít nhất 1 file", type: "warning" });
            return;
        }

        const formData = new FormData();
        attachFiles.forEach((f) => formData.append("files", f));
        formData.append("NguoiTao", user?.fullName || user?.username || user?.id || "system");
        try {
            setAttachUploading(true);
            await api.uploadTaiLieuPhieuSec(detail.id, formData); // API mới
            setAttachFiles([]);
            await loadAttachments(detail.id);
            setToast({ open: true, msg: "Đã upload tài liệu", type: "success" });
        } catch (e) {
            console.error(e);
            setToast({
                open: true,
                msg: e?.response?.data?.message || "Upload tài liệu thất bại",
                type: "error",
            });
        } finally {
            setAttachUploading(false);
        }
    };

    const handleViewAttachment = (tl) => {
        const id = tl.taiLieuId ?? tl.TaiLieuId;
        const name = tl.fileName ?? tl.FileName ?? "Tài liệu";
        const url = api.getTaiLieuPhieuSecUrl(id);
        console.log(tl)
        setPreviewTitle(name);
        setPreviewUrl(url);
        setPreviewOpen(true);
    };

    const handleDeleteAttachment = (tl) => {
        setDeleteTarget(tl);     // lưu lại file được chọn
        setConfirmOpen(true);    // mở dialog
    };


    const handleCloseDetail = () => {
        setOpenDetail(false);
        setDetail(null);
        setAttachList([]);
        setAttachFiles([]);
    };

    return (
        <Box>
            {/* Header actions */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} gap={2} flexWrap="wrap">
                <Typography variant="h5">Phiếu séc</Typography>
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
                        onClick={() => { setQFrom(null); setQTo(null); }}
                        startIcon={<ClearIcon />}
                    >
                        Xoá ngày
                    </Button>

                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
                        Tải lại
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
                        Tạo phiếu
                    </Button>
                </Stack>
            </Stack>

            {!filteredRows ? null : (
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>STT</TableCell>

                                {/* Mã sổ séc + filter icon */}
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Mã sổ séc</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorMa(e.currentTarget)}
                                            aria-label="Lọc theo Mã sổ séc"
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
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 280 } }}
                                    >
                                        <Stack spacing={1}>
                                            <TextField
                                                label="Mã sổ séc"
                                                placeholder="VD: SS-1024 hoặc ABC123"
                                                value={qMa}
                                                onChange={(e) => setQMa(e.target.value)}
                                                autoFocus
                                                size="small"
                                            />
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!!qMa && (
                                                    <Button startIcon={<ClearIcon />} onClick={() => clearFilter("ma")} size="small">
                                                        Xoá
                                                    </Button>
                                                )}
                                                <Button variant="contained" size="small" onClick={() => setAnchorMa(null)}>
                                                    OK
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>

                                {/* Ngày */}
                                <TableCell>Ngày</TableCell>

                                {/* Nội dung + filter icon */}
                                <TableCell sx={{ minWidth: 240 }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Nội dung</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorNoiDung(e.currentTarget)}
                                            aria-label="Lọc theo Nội dung"
                                            color={qNoiDung ? "primary" : "default"}
                                        >
                                            <FilterListRoundedIcon fontSize="inherit" />
                                        </IconButton>
                                    </Stack>

                                    <Popover
                                        open={Boolean(anchorNoiDung)}
                                        anchorEl={anchorNoiDung}
                                        onClose={() => setAnchorNoiDung(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 360 } }}
                                    >
                                        <Stack spacing={1}>
                                            <TextField
                                                label="Nội dung"
                                                placeholder="Nhập từ khoá…"
                                                value={qNoiDung}
                                                onChange={(e) => setQNoiDung(e.target.value)}
                                                autoFocus
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                Tìm không dấu, chứa chuỗi.
                                            </Typography>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!!qNoiDung && (
                                                    <Button startIcon={<ClearIcon />} onClick={() => clearFilter("nd")} size="small">
                                                        Xoá
                                                    </Button>
                                                )}
                                                <Button variant="contained" size="small" onClick={() => setAnchorNoiDung(null)}>
                                                    OK
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>

                                {/* Đơn vị (TextField filter) */}
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Đơn vị</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorDonVi(e.currentTarget)}
                                            aria-label="Lọc theo Đơn vị"
                                            color={qDonVi ? "primary" : "default"}
                                        >
                                            <FilterListRoundedIcon fontSize="inherit" />
                                        </IconButton>
                                    </Stack>

                                    <Popover
                                        open={Boolean(anchorDonVi)}
                                        anchorEl={anchorDonVi}
                                        onClose={() => setAnchorDonVi(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 300 } }}
                                    >
                                        <Stack spacing={1}>
                                            <TextField
                                                label="Tên đơn vị"
                                                placeholder="Nhập từ khoá đơn vị…"
                                                value={qDonVi}
                                                onChange={(e) => setQDonVi(e.target.value)}
                                                autoFocus
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                Tìm theo tên (không dấu). Ví dụ: "vat tu" → “Vật tư”.
                                            </Typography>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!!qDonVi && (
                                                    <Button startIcon={<ClearIcon />} onClick={() => clearFilter("dv")} size="small">
                                                        Xoá
                                                    </Button>
                                                )}
                                                <Button variant="contained" size="small" onClick={() => setAnchorDonVi(null)}>
                                                    OK
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>

                                <TableCell align="right">Số tiền</TableCell>
                                <TableCell align="right">Mã lệnh chi</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Trạng thái</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorTrangThai(e.currentTarget)}
                                            aria-label="Lọc theo Trạng thái"
                                            color={qTrangThai ? "primary" : "default"}
                                        >
                                            <FilterListRoundedIcon fontSize="inherit" />
                                        </IconButton>
                                    </Stack>

                                    <Popover
                                        open={Boolean(anchorTrangThai)}
                                        anchorEl={anchorTrangThai}
                                        onClose={() => setAnchorTrangThai(null)}
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
                                            >
                                                <MenuItem value="">Tất cả</MenuItem>
                                                <MenuItem value="ChoDuyet_TBP">Chờ duyệt TBP</MenuItem>
                                                <MenuItem value="ChoDuyet_KTT">Chờ duyệt KTT</MenuItem>
                                                <MenuItem value="ChoDuyet_GD">Chờ duyệt Giám đốc</MenuItem>
                                                <MenuItem value="HoanThanh">Hoàn thành</MenuItem>
                                                <MenuItem value="TuChoi">Từ chối</MenuItem>
                                            </TextField>

                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!!qTrangThai && (
                                                    <Button startIcon={<ClearIcon />} onClick={() => setQTrangThai("")} size="small">
                                                        Xoá
                                                    </Button>
                                                )}
                                                <Button variant="contained" size="small" onClick={() => setAnchorTrangThai(null)}>
                                                    OK
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>
                                <TableCell align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredRows.map((r, i) => (
                                <TableRow
                                    key={r.id}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() => openDetailDialog(r)}
                                >
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{r.maSoSec || `SS-${r.id}`}</TableCell>
                                    <TableCell>{isoToDisplay(r.ngay).split(" ")[0]}</TableCell>
                                    <TableCell>
                                        <Tooltip title={r.ghiChu || ""}><span>{r.noiDung}</span></Tooltip>
                                    </TableCell>
                                    <TableCell>{donvis.find((d) => d.id === r.donViId)?.name || r.donViId}</TableCell>
                                    <TableCell align="right">{fmtMoney(r.soTien)}</TableCell>
                                    <TableCell align="right">{r.maLenhChi || "—"}</TableCell>
                                    <TableCell><StatusChip status={r.trangThai} /></TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <span>
                                                <IconButton
                                                    color="success"
                                                    disabled={!canApprove(r)}
                                                    onClick={(e) => handleApprove(r, true, e)}
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            </span>
                                            <span>
                                                <IconButton
                                                    color="error"
                                                    disabled={!canApprove(r)}
                                                    onClick={(e) => handleApprove(r, false, e)}
                                                >
                                                    <CancelIcon />
                                                </IconButton>
                                            </span>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {filteredRows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                                            Không có bản ghi phù hợp.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            {/* Dialog chi tiết phiếu */}
            <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="md" fullWidth>
                <DialogTitle
                    sx={{
                        pb: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            Chi tiết phiếu séc
                        </Typography>

                        {detail && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Mã sổ séc:</Typography>
                                    <Typography variant="body2">{detail.maSoSec || `SS-${detail.id}`}</Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => copy(detail.maSoSec || `SS-${detail.id}`)}
                                        aria-label="Copy mã sổ séc"
                                    >
                                        <ContentCopyIcon fontSize="inherit" />
                                    </IconButton>
                                </Stack>

                                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                    • Ngày: {isoToDisplay(detail.ngay).split(" ")[0]} • ID: #{detail.id}
                                </Typography>
                            </Stack>
                        )}
                    </Box>

                    {detail && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <StatusChip status={detail.trangThai} />
                            <Typography
                                sx={{
                                    px: 1.25,
                                    py: 0.5,
                                    borderRadius: 1,
                                    bgcolor: "success.soft",
                                    color: "success.darker",
                                    fontWeight: 700,
                                }}
                            >
                                {fmtMoney(detail.soTien)} đ
                            </Typography>
                        </Box>
                    )}
                </DialogTitle>

                <DialogContent
                    dividers
                    sx={{
                        bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[50] : "background.default"),
                        p: 2.5,
                    }}
                >
                    {!detail ? (
                        <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
                    ) : (
                        <Stack spacing={2.5}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Thông tin chung
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">Mã sổ séc</Typography>
                                        <Typography sx={{ mt: 0.25 }}>{detail.maSoSec || `SS-${detail.id}`}</Typography>
                                    </Grid>

                                    <Grid item xs={12} md={8}>
                                        <Typography variant="caption" color="text.secondary">Nội dung</Typography>
                                        <Typography sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>{detail.noiDung || "—"}</Typography>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">Đơn vị hưởng thụ</Typography>
                                        <Typography sx={{ mt: 0.25 }}>
                                            {detail.tenDonVi || (donvis.find((d) => d.id === detail.donViId)?.name) || `ID: ${detail.donViId}`}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">Người đăng ký (ID)</Typography>
                                        <Typography sx={{ mt: 0.25 }}>{detail.tenNguoiTao ?? "—"}</Typography>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">Đơn vị người tạo</Typography>
                                        <Typography sx={{ mt: 0.25 }}>
                                            {detail.tenDonViNguoiTao || "—"}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                                        <Typography sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
                                            {detail.ghiChu || "—"}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Tài liệu đính kèm
                                </Typography>

                                <Stack spacing={1.5}>
                                    {/* Hàng chọn file + nút upload */}
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
                                        alignItems={{ xs: "stretch", sm: "center" }}
                                    >
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            sx={{ whiteSpace: "nowrap" }}
                                        >
                                            Chọn file
                                            <input
                                                hidden
                                                type="file"
                                                accept="application/pdf"
                                                multiple
                                                onChange={handleAttachFileChange}
                                            />
                                        </Button>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ flex: 1, minHeight: 24 }}
                                        >
                                            {attachFiles.length
                                                ? `${attachFiles.length} file đã chọn`
                                                : "Chưa chọn file nào."}
                                        </Typography>

                                        <Button
                                            variant="contained"
                                            onClick={handleUploadAttachments}
                                            disabled={!attachFiles.length || attachUploading}
                                        >
                                            {attachUploading ? "Đang upload..." : "Upload"}
                                        </Button>
                                    </Stack>

                                    {/* Danh sách tài liệu */}
                                    {attachLoading ? (
                                        <Typography variant="body2" color="text.secondary">
                                            Đang tải danh sách tài liệu...
                                        </Typography>
                                    ) : attachList.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                            Chưa có tài liệu đính kèm.
                                        </Typography>
                                    ) : (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>STT</TableCell>
                                                    <TableCell>Tên file</TableCell>
                                                    <TableCell>Người thêm tài liệu</TableCell>
                                                    <TableCell>Ngày thêm</TableCell>
                                                    <TableCell align="right">Xem</TableCell>
                                                    <TableCell align="right">Xoá</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {attachList.map((tl, idx) => (
                                                    <TableRow key={tl.taiLieuId ?? tl.TaiLieuId ?? idx}>
                                                        <TableCell>{idx + 1}</TableCell>
                                                        <TableCell>{tl.fileName ?? tl.FileName}</TableCell>
                                                        <TableCell>{tl.nguoiTao ?? tl.NguoiTao}</TableCell>
                                                        <TableCell>
                                                            {isoToDisplay(tl.ngayTao ?? tl.NgayTao)}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    handleViewAttachment(
                                                                        tl
                                                                    )
                                                                }
                                                            >
                                                                Xem
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteAttachment(tl)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Stack>
                            </Paper>

                            {canAddLenhChi && (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                        Lệnh chi
                                    </Typography>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                        <TextField
                                            label="Mã lệnh chi"
                                            value={newLenhChi}
                                            onChange={(e) => setNewLenhChi(e.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <Button variant="contained" onClick={saveLenhChi} disabled={savingLC}>
                                            {savingLC ? "Đang lưu..." : "Tạo lệnh chi"}
                                        </Button>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        * Chỉ KTT/Giám đốc (hoặc user được chỉ định) mới được nhập.
                                    </Typography>
                                </Paper>
                            )}

                            {detail?.maLenhChi && (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                        Lệnh chi
                                    </Typography>
                                    <Typography>
                                        Mã lệnh chi: <b>{detail.maLenhChi}</b>
                                    </Typography>
                                    {detail.ngayNhapLenhChi && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Ngày nhập: {isoToDisplay(detail.ngayNhapLenhChi)}
                                        </Typography>
                                    )}
                                    {detail.nguoiNhapLenhChiId && (
                                        <Typography variant="body2" color="text.secondary">
                                            Người nhập (ID): {detail.nguoiNhapLenhChiId}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Lịch sử duyệt
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">TBP duyệt lúc</Typography>
                                        <Typography sx={{ mt: 0.25 }}>{isoToDisplay(detail.tbpTime)}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">KTT duyệt lúc</Typography>
                                        <Typography sx={{ mt: 0.25 }}>{isoToDisplay(detail.kttTime)}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="caption" color="text.secondary">Giám đốc duyệt lúc</Typography>
                                        <Typography sx={{ mt: 0.25 }}>{isoToDisplay(detail.gdTime)}</Typography>
                                    </Grid>
                                </Grid>

                                {detailLoading && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                        Đang tải chi tiết…
                                    </Typography>
                                )}
                            </Paper>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        borderTop: (t) => `1px solid ${t.palette.divider}`,
                        px: 2.5,
                        py: 1.5,
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    {detail && (
                        <Stack direction="row" spacing={1}>
                            <Button
                                color="success"
                                variant="contained"
                                startIcon={<CheckCircleIcon />}
                                disabled={!canApprove(detail)}
                                onClick={() => handleApprove(detail, true)}
                            >
                                Duyệt
                            </Button>
                            <Button
                                color="error"
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                disabled={!canApprove(detail)}
                                onClick={() => handleApprove(detail, false)}
                            >
                                Từ chối
                            </Button>
                        </Stack>
                    )}

                    <Button onClick={handleCloseDetail}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    {previewTitle || "Xem tài liệu"}
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{ p: 0, height: "80vh" }}
                >
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            title="Tài liệu"
                            style={{ width: "100%", height: "100%", border: "none" }}
                        />
                    ) : (
                        <Box p={2}>
                            <Typography>Không có tài liệu để hiển thị.</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog tạo phiếu */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Tạo phiếu séc</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Nội dung"
                            fullWidth
                            value={form.noiDung}
                            onChange={(e) => setForm({ ...form, noiDung: e.target.value })}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                            <Autocomplete
                                sx={{ flex: 1 }}
                                options={donvis}                                  // [{id, name, ...}]
                                value={donvis.find(d => d.id === form.donViId) || null}
                                onChange={(_, val) => setForm({ ...form, donViId: val?.id ?? null })}
                                inputValue={donviInput}
                                onInputChange={(_, val) => setDonviInput(val)}
                                getOptionLabel={(o) => o?.name ?? ""}
                                isOptionEqualToValue={(o, v) => o?.id === v?.id}
                                filterOptions={(options, { inputValue }) => {
                                    const q = stripVN((inputValue || "").toLowerCase().trim());
                                    if (!q) return options;
                                    return options.filter(o => stripVN((o?.name || "").toLowerCase()).includes(q));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Đơn vị hưởng thụ"
                                        placeholder="Gõ tên đơn vị (không dấu)…"
                                        helperText="Nhập vài ký tự để lọc gần đúng theo tên đơn vị."
                                    />
                                )}
                                ListboxProps={{ style: { maxHeight: 320 } }}
                            />

                            {/* Nút + mở dialog thêm đơn vị */}
                            <IconButton
                                onClick={openAddDonVi}
                                color="primary"
                                sx={{
                                    mt: { xs: 0, sm: 0.5 },
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    '&:hover': { bgcolor: 'primary.light', color: 'white' },
                                    transition: '0.2s',
                                }}
                            >
                                <AddIcon fontSize="small" />
                            </IconButton>

                        </Stack>

                        <NumericFormat
                            customInput={TextField}
                            label="Số tiền"
                            thousandSeparator="."
                            decimalSeparator=","
                            allowNegative={false}
                            value={form.soTien}
                            onValueChange={(values) => {
                                setForm({ ...form, soTien: values.floatValue || 0 });
                            }}
                        />
                        <TextField
                            label="Ghi chú"
                            value={form.ghiChu}
                            onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>Đóng</Button>
                    <Button variant="contained" onClick={submitCreate}>Lưu</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openAddDv} onClose={() => setOpenAddDv(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Thêm đơn vị hưởng thụ</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            autoFocus
                            label="Tên đơn vị (VD: Phòng Kế toán)"
                            value={dvName}
                            onChange={(e) => setDvName(e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Số tài khoản (STK)"
                            value={dvStk}
                            onChange={(e) => setDvStk(e.target.value)}
                            fullWidth
                            placeholder="VD: 123456789"
                        />
                        <TextField
                            label="Mã ngân hàng"
                            value={dvMaNH}
                            onChange={(e) => setDvMaNH(e.target.value)}
                            fullWidth
                            placeholder="VD: VCB, BIDV, AGR..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddDv(false)}>Đóng</Button>
                    <Button variant="contained" onClick={saveDonVi} disabled={savingDv}>
                        {savingDv ? "Đang lưu..." : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Xoá tài liệu</DialogTitle>

                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn xoá tài liệu <b>{deleteTarget?.FileName || ""}</b> ?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Huỷ</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            try {
                                await api.deleteTaiLieuPhieuSec(deleteTarget?.TaiLieuId);
                                setToast({ open: true, msg: "Đã xoá tài liệu", type: "success" });
                                await loadAttachments(detail.id);
                            } catch (err) {
                                console.error(err);
                                setToast({ open: true, msg: "Xóa thất bại", type: "error" });
                            } finally {
                                setConfirmOpen(false);
                            }
                        }}
                    >
                        Xoá
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
