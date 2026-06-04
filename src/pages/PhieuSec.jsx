import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Typography,
    Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Tooltip, IconButton, Snackbar, Alert, Popover, MenuItem, FormControl, InputLabel, Select, Tabs, Tab
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import StatusChip from "../components/StatusChip";
import Autocomplete from "@mui/material/Autocomplete";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import * as XLSX from "xlsx";


import { NumericFormat } from "react-number-format";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";

const fmtMoney = (n) => (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const EXPENSE_LABELS = { TienDien: "Tiền điện", TienGiaCong: "Tiền gia công", Khac: "Khác" };
const ACTION_COLUMN_WIDTH = 136;
const stickyActionCellSx = {
    position: { xs: "static", md: "sticky" },
    right: { md: 0 },
    width: ACTION_COLUMN_WIDTH,
    minWidth: ACTION_COLUMN_WIDTH,
    maxWidth: ACTION_COLUMN_WIDTH,
    px: 1,
    boxSizing: "border-box",
    bgcolor: "background.paper",
    zIndex: { xs: "auto", md: 2 },
    boxShadow: { xs: "none", md: (t) => `-1px 0 0 ${t.palette.divider}` },
};
const stickyStatusCellSx = {
    position: { xs: "static", md: "sticky" },
    right: { md: ACTION_COLUMN_WIDTH },
    minWidth: 145,
    bgcolor: "background.paper",
    zIndex: { xs: "auto", md: 2 },
};
const DEFAULT_STATUS_ORDER = ["ChoDuyet_TBP", "ChoDuyet_KTT", "ChoDuyet_GD", "KhoiTao", "HoanThanh", "TuChoi"];
const STATUS_ORDER_BY_ROLE = {
    TBP: ["ChoDuyet_TBP", "ChoDuyet_KTT", "ChoDuyet_GD", "KhoiTao", "HoanThanh", "TuChoi"],
    KTT: ["ChoDuyet_KTT", "ChoDuyet_GD", "ChoDuyet_TBP", "KhoiTao", "HoanThanh", "TuChoi"],
    GD: ["ChoDuyet_GD", "ChoDuyet_KTT", "ChoDuyet_TBP", "KhoiTao", "HoanThanh", "TuChoi"],
    Admin: ["ChoDuyet_TBP", "ChoDuyet_KTT", "ChoDuyet_GD", "KhoiTao", "HoanThanh", "TuChoi"],
};

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
const hasSelectedText = () => {
    if (typeof window === "undefined") return false;
    return window.getSelection()?.toString().trim().length > 0;
};

const getDisplayStatus = (phieu) => {
    if (phieu?.trangThai !== "HoanThanh") return phieu?.trangThai;
    return phieu?.maLenhChi ? "HoanThanh_DaCoLenhChi" : "HoanThanh_ChuaCoLenhChi";
};

const getCompletedAt = (phieu) => {
    if (phieu?.trangThai !== "HoanThanh") return null;
    return phieu?.gdTime || phieu?.kttTime || null;
};

const DetailField = ({ label, children, sx }) => (
    <Box sx={{ minWidth: 0, minHeight: 56, ...sx }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ mt: 0.35, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            {children || "—"}
        </Typography>
    </Box>
);

const MobileInfoRow = ({ label, children, strong = false }) => (
    <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ py: 0.85, borderBottom: (t) => `1px dashed ${t.palette.divider}` }}
    >
        <Typography variant="caption" color="text.secondary" sx={{ width: 104, flexShrink: 0 }}>
            {label}
        </Typography>
        <Typography
            sx={{
                minWidth: 0,
                textAlign: "right",
                fontSize: "0.88rem",
                fontWeight: strong ? 700 : 500,
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
            }}
        >
            {children || "—"}
        </Typography>
    </Stack>
);

const MobileSectionTitle = ({ children }) => (
    <Typography
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.2 }}
    >
        {children}
    </Typography>
);

export default function PhieuSec({ mode = "VND" }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { role, user, permissions = [] } = useAuth();
    const isNgoaiTe = mode === "NgoaiTe";

    // dữ liệu chính
    const [rows, setRows] = useState(null);
    const [pendingLenhChiRows, setPendingLenhChiRows] = useState(null);
    const [activeTab, setActiveTab] = useState("group");
    const [donvis, setDonvis] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [banks, setBanks] = useState([]);

    // dialog tạo / detail
    const [openCreate, setOpenCreate] = useState(false);
    const [editingPhieu, setEditingPhieu] = useState(null);
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
    const [dvChiNhanhNH, setDvChiNhanhNH] = useState("");
    const [savingDv, setSavingDv] = useState(false);
    // form tạo
    const [form, setForm] = useState({
        noiDung: "",
        donViId: 1,
        soTien: 0,
        nguoiDangKyId: user?.id || null,
        ghiChu: "",
        maLoaiChiPhi: "Khac",
        maLoaiTien: isNgoaiTe ? "" : "VND",
    });

    // nhập lệnh chi
    const [newLenhChi, setNewLenhChi] = useState("");
    const [savingLC, setSavingLC] = useState(false);

    // filter (client)
    const [qMa, setQMa] = useState("");
    const [qNoiDung, setQNoiDung] = useState("");
    const [qDonVi, setQDonVi] = useState(""); // text input cho đơn vị
    const [qNguoiTao, setQNguoiTao] = useState("");
    const [qFrom, setQFrom] = useState(null); // dayjs | null
    const [qTo, setQTo] = useState(null);     // dayjs | null
    const [qCompletedFrom, setQCompletedFrom] = useState(null);
    const [qCompletedTo, setQCompletedTo] = useState(null);
    const [qTrangThai, setQTrangThai] = useState("");
    const [qMobile, setQMobile] = useState("");
    const [anchorTrangThai, setAnchorTrangThai] = useState(null);
    // anchor Popover cho từng cột
    const [anchorMa, setAnchorMa] = useState(null);
    const [anchorNoiDung, setAnchorNoiDung] = useState(null);
    const [anchorDonVi, setAnchorDonVi] = useState(null);
    const [anchorNguoiTao, setAnchorNguoiTao] = useState(null);
    const [anchorCompleted, setAnchorCompleted] = useState(null);

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
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnTarget, setReturnTarget] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnSubmitting, setReturnSubmitting] = useState(false);

    const hasPermission = (code) =>
        role === "Admin" ||
        permissions.includes("Admin") ||
        permissions.includes(code) ||
        role === code;

    const canManageLenhChi = hasPermission("KTT") || hasPermission("GD") || hasPermission("TaoLenhChi");
    const canAddLenhChi =
        detail && detail.trangThai === "HoanThanh" && !detail.maLenhChi && canManageLenhChi;

    const load = async () => {
        const params = {
            userId: user?.id,
            roleCode: role,      // "NhanVien" | "TBP" | "KTT" | "GD"
            idDonVi: user?.idDonVi,
            loaiSec: mode,
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

        const [dv, currencyRows, bankRows] = await Promise.all([
            api.listDonVi(),
            api.listLoaiTien({ tontai: 1 }),
            api.listNganHang({ tontai: 1 }),
        ]);
        logSoSec("load:listDonVi result", { count: dv?.length ?? 0 });
        setRows(p);
        setDonvis(dv);
        setCurrencies(currencyRows || []);
        setBanks(bankRows || []);
        setForm((f) => ({ ...f, donViId: dv?.[0]?.id ?? 1 }));
    };

    const loadPendingLenhChi = async () => {
        if (!canManageLenhChi || !user?.id) return;
        const pending = await api.listPendingLenhChi(user.id, { loaiSec: mode });
        logSoSec("load:pendingLenhChi result", { count: pending?.length ?? 0, ids: (pending || []).map((x) => x.id) });
        setPendingLenhChiRows(pending);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    useEffect(() => {
        if (activeTab === "pending") loadPendingLenhChi();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const canApprove = (p) =>
        (p?.trangThai === "ChoDuyet_TBP" && hasPermission("TBP")) ||
        (p?.trangThai === "ChoDuyet_KTT" && hasPermission("KTT")) ||
        (p?.trangThai === "ChoDuyet_GD" && hasPermission("GD"));

    const canReject = (p) =>
        canApprove(p) || (hasPermission("KTT") && p?.trangThai === "ChoDuyet_GD");

    const canReturn = (p) =>
        hasPermission("KTT") && ["ChoDuyet_KTT", "ChoDuyet_GD"].includes(p?.trangThai);

    const canEdit = (p) =>
        p?.trangThai === "ChoDuyet_TBP" && (hasPermission("Admin") || Number(p?.nguoiDangKyId) === Number(user?.id));

    const getDonViByPhieu = (p) => donvis.find((d) => d.id === p?.donViId);
    const getTenNganHang = (p) => p?.tenNganHangHuongThu || getDonViByPhieu(p)?.tenNganHang || null;

    const resetForm = () => {
        setForm({
            noiDung: "",
            donViId: donvis[0]?.id || 1,
            soTien: 0,
            nguoiDangKyId: user?.id || null,
            ghiChu: "",
            maLoaiChiPhi: "Khac",
            maLoaiTien: isNgoaiTe ? "" : "VND",
        });
        setEditingPhieu(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setOpenCreate(true);
    };

    const openEditDialog = (phieu, e) => {
        e?.stopPropagation();
        if (!canEdit(phieu)) return;
        setEditingPhieu(phieu);
        setForm({
            noiDung: phieu.noiDung || "",
            donViId: phieu.donViId || null,
            soTien: Number(phieu.soTien || 0),
            nguoiDangKyId: phieu.nguoiDangKyId || null,
            ghiChu: phieu.ghiChu || "",
            maLoaiChiPhi: phieu.maLoaiChiPhi || "Khac",
            maLoaiTien: phieu.maLoaiTien || (isNgoaiTe ? "" : "VND"),
        });
        setOpenCreate(true);
    };

    const handleApprove = async (p, agree, e) => {
        e?.stopPropagation();
        if (!agree) {
            setRejectTarget(p);
            setRejectReason("");
            setRejectOpen(true);
            return;
        }
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

    const submitReject = async () => {
        const reason = rejectReason.trim();
        if (!reason) {
            setToast({ open: true, msg: "Nhập lý do từ chối", type: "warning" });
            return;
        }
        try {
            setRejectSubmitting(true);
            if (!canReject(rejectTarget)) throw new Error("Bạn không có quyền từ chối ở bước này");
            const updated = await api.approve(rejectTarget.id, role, false, user, reason);
            setRows((r) => (r ? r.map((x) => (x.id === updated.id ? updated : x)) : r));
            setDetail((d) => (d && d.id === updated.id ? updated : d));
            setRejectOpen(false);
            setRejectTarget(null);
            setRejectReason("");
            setToast({ open: true, msg: "Đã từ chối phiếu", type: "success" });
        } catch (e) {
            setToast({ open: true, msg: e?.response?.data?.message || e.message || "Lỗi từ chối phiếu", type: "error" });
        } finally {
            setRejectSubmitting(false);
        }
    };

    const openReturnDialog = (p, e) => {
        e?.stopPropagation();
        if (!canReturn(p)) return;
        setReturnTarget(p);
        setReturnReason("");
        setReturnOpen(true);
    };

    const submitReturn = async () => {
        const reason = returnReason.trim();
        if (!reason) {
            setToast({ open: true, msg: "Nhập lý do trả lại", type: "warning" });
            return;
        }
        try {
            setReturnSubmitting(true);
            if (!canReturn(returnTarget)) throw new Error("Bạn không có quyền trả lại phiếu ở bước này");
            const updated = await api.returnPhieu(returnTarget.id, role, user, reason);
            setDetail((d) => (d && d.id === updated.id ? updated : d));
            await load();
            setReturnOpen(false);
            setReturnTarget(null);
            setReturnReason("");
            setToast({ open: true, msg: "Đã trả lại phiếu để chỉnh sửa", type: "success" });
        } catch (e) {
            setToast({ open: true, msg: e?.response?.data?.message || e.message || "Lỗi trả lại phiếu", type: "error" });
        } finally {
            setReturnSubmitting(false);
        }
    };

    const submitCreate = async () => {
        try {
            if (!form.noiDung.trim()) throw new Error("Nhập nội dung");
            if (!form.soTien || Number(form.soTien) <= 0) throw new Error("Số tiền > 0");
            if (isNgoaiTe && !form.maLoaiTien) throw new Error("Chọn loại tiền ngoại tệ");

            const payload = {
                ngay: new Date().toISOString().slice(0, 10),
                noiDung: form.noiDung,
                donViId: form.donViId,
                soTien: Number(form.soTien),
                nguoiDangKyId: user?.id,
                idDonVi: user?.idDonVi,
                ghiChu: form.ghiChu,
                loaiSec: mode,
                maLoaiChiPhi: isNgoaiTe ? "Khac" : form.maLoaiChiPhi,
                maLoaiTien: isNgoaiTe ? form.maLoaiTien : "VND",
            };

            logSoSec("create:payload", payload, { role, user });
            if (editingPhieu) {
                await api.updatePhieu(editingPhieu.id, { ...payload, requesterUserId: user?.id });
            } else {
                const created = await api.createPhieu(payload);
                logSoSec("create:result", created);
            }

            setOpenCreate(false);
            resetForm();
            await load();
            setToast({ open: true, msg: editingPhieu ? "Đã cập nhật phiếu" : "Đã tạo phiếu", type: "success" });
        } catch (e) {
            setToast({ open: true, msg: e?.response?.data?.message || e.message || "Lỗi lưu phiếu", type: "error" });
        }
    };

    const openAddDonVi = () => {
        setDvName("");
        setDvStk("");
        setDvMaNH("");
        setDvChiNhanhNH("");
        setOpenAddDv(true);
    };

    const saveDonVi = async () => {
        const n = dvName.trim();
        const s = dvStk?.trim();
        const m = dvMaNH?.trim();
        const branch = dvChiNhanhNH?.trim() || null;
        const selectedBank = banks.find((bank) => bank.MaNganHang === m);
        if (!n || !s || !m || !selectedBank) {
            setToast({ open: true, msg: "Nhập đủ tên đơn vị, số tài khoản và mã ngân hàng", type: "error" });
            return;
        }
        try {
            setSavingDv(true);
            const created = await api.createDonVi({ name: n, stk: s, maNganHang: m, chiNhanhNganHang: branch }); // { id, name, ... }
            const createdWithBank = { ...created, tenNganHang: selectedBank.TenNganHang };
            // cập nhật danh sách + chọn ngay đơn vị mới
            setDonvis((list) => {
                const next = [...(list || []), createdWithBank];
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

            const fresh = { ...detail, maLenhChi: newLenhChi.trim() };

            setDetail(fresh);
            setRows((r) => r?.map((x) => (x.id === detail.id ? { ...x, maLenhChi: fresh.maLenhChi } : x)));
            setPendingLenhChiRows((r) => r?.filter((x) => x.id !== detail.id));
            setNewLenhChi("");
            handleCloseDetail();
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

    // Lọc client theo mã, nội dung, đơn vị và người tạo.
    const filteredRows = useMemo(() => {
        const sourceRows = activeTab === "pending" ? pendingLenhChiRows : rows;
        if (!sourceRows) return null;

        const hasMa = qMa.trim() !== "";
        const hasNd = qNoiDung.trim() !== "";
        const hasDv = qDonVi.trim() !== "";
        const hasNguoiTao = qNguoiTao.trim() !== "";
        const hasFrom = !!qFrom;
        const hasTo = !!qTo;
        const hasCompletedFrom = !!qCompletedFrom;
        const hasCompletedTo = !!qCompletedTo;
        const hasMobile = qMobile.trim() !== "";

        const qMaNorm = stripVN(qMa.trim().toLowerCase());
        const qNdNorm = stripVN(qNoiDung.trim().toLowerCase());
        const qDvNorm = stripVN(qDonVi.trim().toLowerCase());
        const qNguoiTaoNorm = stripVN(qNguoiTao.trim().toLowerCase());
        const qMobileNorm = stripVN(qMobile.trim().toLowerCase());

        const statusOrder = STATUS_ORDER_BY_ROLE[role] || DEFAULT_STATUS_ORDER;
        const statusRank = new Map(statusOrder.map((status, index) => [status, index]));

        return sourceRows.filter((r) => {
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
            let okCompletedDate = true;
            if (hasCompletedFrom || hasCompletedTo) {
                const completedAt = dayjs(getCompletedAt(r));
                if (completedAt.isValid()) {
                    const completedVal = completedAt.startOf("day").valueOf();
                    if (hasCompletedFrom) okCompletedDate = okCompletedDate && completedVal >= qCompletedFrom.startOf("day").valueOf();
                    if (hasCompletedTo) okCompletedDate = okCompletedDate && completedVal <= qCompletedTo.startOf("day").valueOf();
                } else {
                    okCompletedDate = false;
                }
            }
            let okStatus = true;
            if (qTrangThai) {
                const displayStatus = getDisplayStatus(r);
                okStatus = qTrangThai === "HoanThanh"
                    ? r.trangThai === "HoanThanh"
                    : displayStatus === qTrangThai;
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
                const donVi = donvis.find((d) => d.id === r.donViId);
                const searchableDonVi = [
                    r.tenDonVi, donVi?.name,
                    r.soTaiKhoanHuongThu, donVi?.stk,
                    r.maNganHangHuongThu, donVi?.maNganHang,
                    getTenNganHang(r),
                    r.chiNhanhNganHangHuongThu, donVi?.chiNhanhNganHang,
                    r.donViId,
                ].filter(Boolean).join(" ");
                okDv = stripVN(searchableDonVi.toLowerCase()).includes(qDvNorm);
            }

            let okNguoiTao = true;
            if (hasNguoiTao) {
                okNguoiTao = stripVN(String(r.tenNguoiTao || "").toLowerCase()).includes(qNguoiTaoNorm);
            }

            let okMobile = true;
            if (hasMobile) {
                const donVi = donvis.find((d) => d.id === r.donViId);
                const mobileSearchText = [
                    r.maSoSec || `SS-${r.id}`,
                    isoToDisplay(r.ngay).split(" ")[0],
                    r.tenNguoiTao,
                    r.tenDonVi,
                    donVi?.name,
                    r.soTien,
                    r.maLoaiTien,
                    r.noiDung,
                    r.soTaiKhoanHuongThu,
                    donVi?.stk,
                    r.maNganHangHuongThu,
                    donVi?.maNganHang,
                    getTenNganHang(r),
                ].filter(Boolean).join(" ");
                okMobile = stripVN(String(mobileSearchText).toLowerCase()).includes(qMobileNorm);
            }

            return okDate && okCompletedDate && okStatus && okMa && okNd && okDv && okNguoiTao && okMobile;
        }).sort((a, b) => {
            const rankA = statusRank.get(a.trangThai) ?? statusOrder.length;
            const rankB = statusRank.get(b.trangThai) ?? statusOrder.length;
            if (rankA !== rankB) return rankA - rankB;

            const dateA = dayjs(a.ngay).isValid() ? dayjs(a.ngay).valueOf() : 0;
            const dateB = dayjs(b.ngay).isValid() ? dayjs(b.ngay).valueOf() : 0;
            if (dateA !== dateB) return dateB - dateA;

            return Number(b.id || 0) - Number(a.id || 0);
        });
    }, [activeTab, pendingLenhChiRows, rows, qMa, qNoiDung, qDonVi, qNguoiTao, qMobile, qFrom, qTo, qCompletedFrom, qCompletedTo, qTrangThai, donvis, role]);

    // clear từng filter
    const clearFilter = (key) => {
        if (key === "ma") setQMa("");
        if (key === "nd") setQNoiDung("");
        if (key === "dv") setQDonVi("");
        if (key === "nguoiTao") setQNguoiTao("");
        if (key === "completed") {
            setQCompletedFrom(null);
            setQCompletedTo(null);
        }
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

    const exportExcel = () => {
        if (!filteredRows?.length) {
            setToast({ open: true, msg: "Không có dữ liệu để xuất", type: "warning" });
            return;
        }

        const data = filteredRows.map((row, index) => {
            const donVi = donvis.find((item) => item.id === row.donViId);
            return {
                STT: index + 1,
                "Mã sổ séc": row.maSoSec || `SS-${row.id}`,
                Ngày: isoToDisplay(row.ngay).split(" ")[0],
                "Nội dung": row.noiDung,
                "Đơn vị hưởng thụ": row.tenDonVi || donVi?.name,
                "Số tài khoản": row.soTaiKhoanHuongThu || donVi?.stk,
                "Mã ngân hàng": row.maNganHangHuongThu || donVi?.maNganHang,
                "Tên ngân hàng": getTenNganHang(row),
                "Chi nhánh ngân hàng": row.chiNhanhNganHangHuongThu || donVi?.chiNhanhNganHang,
                "Loại chi phí": EXPENSE_LABELS[row.maLoaiChiPhi] || row.maLoaiChiPhi,
                "Loại tiền": row.maLoaiTien || "VND",
                "Số tiền": row.soTien,
                "Mã lệnh chi": row.maLenhChi,
                "Ngày hoàn thành": isoToDisplay(getCompletedAt(row)).split(" ")[0],
                "Trạng thái": row.trangThai,
                "Người đăng ký": row.tenNguoiTao,
                "Đơn vị người tạo": row.tenDonViNguoiTao,
                "Ghi chú": row.ghiChu,
            };
        });
        const sheet = XLSX.utils.json_to_sheet(data);
        sheet["!cols"] = [
            { wch: 6 }, { wch: 16 }, { wch: 12 }, { wch: 42 }, { wch: 30 },
            { wch: 20 }, { wch: 16 }, { wch: 34 }, { wch: 28 }, { wch: 18 }, { wch: 12 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 28 },
            { wch: 36 },
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Phieu sec");
        const from = qFrom?.format("YYYY-MM-DD") || "tat-ca";
        const to = qTo?.format("YYYY-MM-DD") || "tat-ca";
        XLSX.writeFile(workbook, `phieu-sec-${isNgoaiTe ? "ngoai-te" : "vnd"}_${from}_${to}.xlsx`);
    };

    const exportTransferExcel = () => {
        if (!filteredRows?.length) {
            setToast({ open: true, msg: "Không có dữ liệu để xuất", type: "warning" });
            return;
        }

        const headers = [
            "STT",
            "TK chuyển/\nDebit account\n(*)",
            "Số  tiền chuyển/\n Amount\n(*)",
            "TK hưởng/\nBeneficiary Account\n(*)",
            "Tên người hưởng/\nBeneficiary Name\n(*)",
            "Tên chi nhánh Ngân hàng thụ hưởng/\nBeneficiary Bank\n(*)",
            "Nội dung/\nReference\n(*)",
            "Mã người thụ hưởng/\nBeneficiary No",
            "Số chứng từ/ Ref No",
            "Ngày thanh toán/ Effective date",
            "Mã ngân hàng",
        ];

        const rows = filteredRows.map((row, index) => {
            const donVi = donvis.find((item) => item.id === row.donViId);
            return [
                index + 1,
                "116000002441",
                Math.round(Number(row.soTien || 0)),
                row.soTaiKhoanHuongThu || donVi?.stk || "",
                row.tenDonVi || donVi?.name || "",
                row.maNganHangHuongThu || donVi?.maNganHang || "",
                row.noiDung || "",
                "",
                "",
                "",
                getTenNganHang(row) || "",
            ];
        });

        const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        sheet["!cols"] = [
            { wch: 6 },
            { wch: 30 },
            { wch: 29 },
            { wch: 16 },
            { wch: 23 },
            { wch: 54 },
            { wch: 12 },
            { wch: 13 },
            { wch: 10 },
            { wch: 13 },
            { wch: 16 },
        ];
        sheet["!rows"] = [{ hpt: 93 }, ...rows.map(() => ({ hpt: 15 }))];

        headers.forEach((_, index) => {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: index })];
            if (cell) {
                cell.s = {
                    fill: { fgColor: { rgb: "BFBFBF" } },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    font: { bold: true },
                };
            }
        });
        rows.forEach((_, rowIndex) => {
            const amountCell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: 2 })];
            if (amountCell) amountCell.z = "0";
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Danh sach");
        const from = qFrom?.format("YYYY-MM-DD") || "tat-ca";
        const to = qTo?.format("YYYY-MM-DD") || "tat-ca";
        XLSX.writeFile(workbook, `sec-chuyen-tien-${isNgoaiTe ? "ngoai-te" : "vnd"}_${from}_${to}.xls`, { bookType: "xls" });
    };

    return (
        <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
            {/* Header actions - desktop */}
            <Stack
                sx={{ display: { xs: "none", md: "flex" } }}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                mb={2}
                gap={2}
                flexWrap="wrap"
            >
                <Typography variant="h5" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" }, fontWeight: 700 }}>
                    Phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}
                </Typography>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    flexWrap="wrap"
                    sx={{
                        width: { xs: "100%", sm: "auto" },
                        "& .MuiFormControl-root, & .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                    }}
                >
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

                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={activeTab === "pending" ? loadPendingLenhChi : load}>
                        Tải lại
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportTransferExcel}>
                        Xuất Excel
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                        Tạo phiếu
                    </Button>
                </Stack>
            </Stack>

            {/* Header actions - mobile */}
            <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, mb: 1.25 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.2 }}>
                            Phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {filteredRows ? `${filteredRows.length} phiếu` : "Đang tải..."}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ flexShrink: 0, borderRadius: 999 }}
                    >
                        Tạo
                    </Button>
                </Stack>

                <Paper variant="outlined" sx={{ p: 1, borderRadius: 2.5, bgcolor: "background.paper" }}>
                    <Stack spacing={1}>
                        <TextField
                            label="Tìm nhanh"
                            placeholder="Số séc, đơn vị, người tạo..."
                            value={qMobile}
                            onChange={(e) => setQMobile(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ sx: { fontSize: "0.82rem" } }}
                            inputProps={{ style: { fontSize: "0.86rem", paddingTop: 8, paddingBottom: 8 } }}
                        />

                        <Stack direction="row" spacing={1}>
                            <FormControl size="small" fullWidth>
                                <InputLabel sx={{ fontSize: "0.82rem" }}>Trạng thái</InputLabel>
                                <Select
                                    label="Trạng thái"
                                    value={qTrangThai}
                                    onChange={(e) => setQTrangThai(e.target.value)}
                                    sx={{ fontSize: "0.86rem", "& .MuiSelect-select": { py: 0.85 } }}
                                >
                                    <MenuItem value="">Tất cả</MenuItem>
                                    <MenuItem value="ChoDuyet_TBP">Chờ TBP</MenuItem>
                                    <MenuItem value="ChoDuyet_KTT">Chờ KTT</MenuItem>
                                    <MenuItem value="ChoDuyet_GD">Chờ GĐ</MenuItem>
                                    <MenuItem value="HoanThanh">Hoàn thành</MenuItem>
                                    <MenuItem value="TuChoi">Từ chối</MenuItem>
                                    <MenuItem value="HoanThanh_ChuaCoLenhChi">Chờ lệnh chi</MenuItem>
                                    <MenuItem value="HoanThanh_DaCoLenhChi">Đã có lệnh chi</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={activeTab === "pending" ? loadPendingLenhChi : load}
                                sx={{ minWidth: 82, fontSize: "0.76rem" }}
                            >
                                Tải
                            </Button>
                        </Stack>

                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction="row" spacing={1}>
                                <DatePicker
                                    label="Từ"
                                    value={qFrom}
                                    onChange={setQFrom}
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            fullWidth: true,
                                            InputLabelProps: { sx: { fontSize: "0.82rem" } },
                                            inputProps: { style: { fontSize: "0.84rem", paddingTop: 8, paddingBottom: 8 } },
                                        },
                                    }}
                                />
                                <DatePicker
                                    label="Đến"
                                    value={qTo}
                                    onChange={setQTo}
                                    minDate={qFrom || undefined}
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            fullWidth: true,
                                            InputLabelProps: { sx: { fontSize: "0.82rem" } },
                                            inputProps: { style: { fontSize: "0.84rem", paddingTop: 8, paddingBottom: 8 } },
                                        },
                                    }}
                                />
                            </Stack>
                        </LocalizationProvider>

                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => { setQFrom(null); setQTo(null); setQMobile(""); setQTrangThai(""); }}
                                startIcon={<ClearIcon />}
                                sx={{ flex: 1, fontSize: "0.76rem" }}
                            >
                                Xoá lọc
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={exportTransferExcel}
                                sx={{ flex: 1, fontSize: "0.76rem" }}
                            >
                                Excel
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Stack>

            {canManageLenhChi && (
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="scrollable"
                    allowScrollButtonsMobile
                    sx={{ mb: 2, minHeight: { xs: 40, md: 48 }, "& .MuiTab-root": { minHeight: { xs: 40, md: 48 } } }}
                >
                    <Tab value="group" label="Phiếu bộ phận" />
                    <Tab value="pending" label="Cần nhập lệnh chi" />
                </Tabs>
            )}

            {!filteredRows ? null : (
                <>
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                    component={Paper}
                    sx={{
                        maxWidth: "100%",
                        maxHeight: "calc(100vh - 240px)",
                        overflow: "auto",
                    }}
                >
                    <Table size="small" stickyHeader sx={{ minWidth: 2100 }}>
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
                                                Tìm theo tên, STK, mã ngân hàng hoặc chi nhánh.
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

                                <TableCell sx={{ whiteSpace: "nowrap" }}>Số tài khoản</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>Mã ngân hàng</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap", minWidth: 220 }}>Tên ngân hàng</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>Chi nhánh ngân hàng</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Người tạo</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorNguoiTao(e.currentTarget)}
                                            aria-label="Lọc theo Người tạo"
                                            color={qNguoiTao ? "primary" : "default"}
                                        >
                                            <FilterListRoundedIcon fontSize="inherit" />
                                        </IconButton>
                                    </Stack>

                                    <Popover
                                        open={Boolean(anchorNguoiTao)}
                                        anchorEl={anchorNguoiTao}
                                        onClose={() => setAnchorNguoiTao(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 300 } }}
                                    >
                                        <Stack spacing={1}>
                                            <TextField
                                                label="Tên người tạo"
                                                placeholder="Nhập tên người tạo…"
                                                value={qNguoiTao}
                                                onChange={(e) => setQNguoiTao(e.target.value)}
                                                autoFocus
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                Tìm theo tên không dấu, chứa chuỗi.
                                            </Typography>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!!qNguoiTao && (
                                                    <Button startIcon={<ClearIcon />} onClick={() => clearFilter("nguoiTao")} size="small">
                                                        Xoá
                                                    </Button>
                                                )}
                                                <Button variant="contained" size="small" onClick={() => setAnchorNguoiTao(null)}>
                                                    OK
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Popover>
                                </TableCell>

                                <TableCell>Loại chi phí</TableCell>
                                <TableCell>Loại tiền</TableCell>
                                <TableCell align="right">Số tiền</TableCell>
                                <TableCell align="right">Mã lệnh chi</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <span>Ngày hoàn thành</span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setAnchorCompleted(e.currentTarget)}
                                            aria-label="Lọc theo ngày hoàn thành"
                                            color={qCompletedFrom || qCompletedTo ? "primary" : "default"}
                                        >
                                            <FilterListRoundedIcon fontSize="inherit" />
                                        </IconButton>
                                    </Stack>
                                    <Popover
                                        open={Boolean(anchorCompleted)}
                                        anchorEl={anchorCompleted}
                                        onClose={() => setAnchorCompleted(null)}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        PaperProps={{ sx: { p: 1.5, width: 300 } }}
                                    >
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <Stack spacing={1.25}>
                                                <DatePicker
                                                    label="Từ ngày"
                                                    value={qCompletedFrom}
                                                    onChange={setQCompletedFrom}
                                                    slotProps={{ textField: { size: "small" } }}
                                                />
                                                <DatePicker
                                                    label="Đến ngày"
                                                    value={qCompletedTo}
                                                    onChange={setQCompletedTo}
                                                    slotProps={{ textField: { size: "small" } }}
                                                />
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    {(qCompletedFrom || qCompletedTo) && (
                                                        <Button startIcon={<ClearIcon />} onClick={() => clearFilter("completed")} size="small">
                                                            Xóa
                                                        </Button>
                                                    )}
                                                    <Button variant="contained" size="small" onClick={() => setAnchorCompleted(null)}>
                                                        OK
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </LocalizationProvider>
                                    </Popover>
                                </TableCell>
                                <TableCell sx={{ ...stickyStatusCellSx, whiteSpace: "nowrap", zIndex: 4 }}>
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
                                                <MenuItem value="HoanThanh_ChuaCoLenhChi">Hoàn thành - chờ lệnh chi</MenuItem>
                                                <MenuItem value="HoanThanh_DaCoLenhChi">Hoàn thành - đã có lệnh chi</MenuItem>
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
                                <TableCell sx={{ ...stickyActionCellSx, zIndex: 4 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredRows.map((r, i) => (
                                <TableRow
                                    key={r.id}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() => {
                                        if (hasSelectedText()) return;
                                        openDetailDialog(r);
                                    }}
                                >
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{r.maSoSec || `SS-${r.id}`}</TableCell>
                                    <TableCell>{isoToDisplay(r.ngay).split(" ")[0]}</TableCell>
                                    <TableCell>
                                        <Tooltip title={r.ghiChu || ""}><span>{r.noiDung}</span></Tooltip>
                                    </TableCell>
                                    <TableCell>{donvis.find((d) => d.id === r.donViId)?.name || r.donViId}</TableCell>
                                    <TableCell>{r.soTaiKhoanHuongThu || donvis.find((d) => d.id === r.donViId)?.stk || "—"}</TableCell>
                                    <TableCell>{r.maNganHangHuongThu || donvis.find((d) => d.id === r.donViId)?.maNganHang || "—"}</TableCell>
                                    <TableCell>{getTenNganHang(r) || "—"}</TableCell>
                                    <TableCell>{r.chiNhanhNganHangHuongThu || donvis.find((d) => d.id === r.donViId)?.chiNhanhNganHang || "—"}</TableCell>
                                    <TableCell>{r.tenNguoiTao || "—"}</TableCell>
                                    <TableCell>{EXPENSE_LABELS[r.maLoaiChiPhi] || r.maLoaiChiPhi || "—"}</TableCell>
                                    <TableCell>{r.maLoaiTien || "VND"}</TableCell>
                                    <TableCell align="right">{fmtMoney(r.soTien)}</TableCell>
                                    <TableCell align="right">{r.maLenhChi || "—"}</TableCell>
                                    <TableCell>{isoToDisplay(getCompletedAt(r)).split(" ")[0]}</TableCell>
                                    <TableCell sx={stickyStatusCellSx}><StatusChip status={getDisplayStatus(r)} /></TableCell>
                                    <TableCell sx={stickyActionCellSx} onClick={(e) => e.stopPropagation()}>
                                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 40px)", alignItems: "center" }}>
                                            <Box sx={{ visibility: canEdit(r) || canReturn(r) ? "visible" : "hidden" }}>
                                                {canEdit(r) ? (
                                                    <IconButton
                                                        color="primary"
                                                        onClick={(e) => openEditDialog(r, e)}
                                                        aria-label="Sửa phiếu"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                ) : (
                                                    <Tooltip title="Trả lại để chỉnh sửa">
                                                        <IconButton
                                                            color="warning"
                                                            onClick={(e) => openReturnDialog(r, e)}
                                                            aria-label="Trả lại phiếu"
                                                        >
                                                            <KeyboardReturnIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
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
                                                    disabled={!canReject(r)}
                                                    onClick={(e) => handleApprove(r, false, e)}
                                                >
                                                    <CancelIcon />
                                                </IconButton>
                                            </span>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {filteredRows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={17}>
                                        <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                                            Không có bản ghi phù hợp.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                    </Box>

                    <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" }, mt: 1 }}>
                        {filteredRows.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                                <Typography align="center" color="text.secondary" variant="body2">
                                    Không có bản ghi phù hợp.
                                </Typography>
                            </Paper>
                        ) : filteredRows.map((r) => {
                            const donVi = donvis.find((d) => d.id === r.donViId);
                            const beneficiaryName = r.tenDonVi || donVi?.name || `ID: ${r.donViId}`;
                            const createdDate = isoToDisplay(r.ngay).split(" ")[0];
                            return (
                                <Paper
                                    key={r.id}
                                    variant="outlined"
                                    onClick={() => openDetailDialog(r)}
                                    sx={{
                                        p: 1.25,
                                        borderRadius: 2.5,
                                        bgcolor: "background.paper",
                                        cursor: "pointer",
                                        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
                                    }}
                                >
                                    <Stack spacing={0.75}>
                                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: "0.96rem" }} noWrap>
                                                    {r.maSoSec || `SS-${r.id}`}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {createdDate} · {r.tenNguoiTao || "—"}
                                                </Typography>
                                            </Box>
                                            <StatusChip status={getDisplayStatus(r)} />
                                        </Stack>

                                        <Typography sx={{ fontSize: "0.92rem", fontWeight: 700, color: "primary.main" }}>
                                            {fmtMoney(r.soTien)} {r.maLoaiTien || "VND"}
                                        </Typography>

                                        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                                            {beneficiaryName}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                            {r.noiDung || "Không có nội dung"}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                </>
            )}

            {/* Dialog chi tiết phiếu */}
            <Dialog
                open={openDetail}
                onClose={handleCloseDetail}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 }, overflow: "hidden" } }}
            >
                <DialogTitle
                    sx={{
                        pb: { xs: 1, sm: 1.5 },
                        px: { xs: 1.5, sm: 3 },
                        pt: { xs: 1.25, sm: 2 },
                        display: "flex",
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: { xs: 1, sm: 2 },
                        bgcolor: { xs: "primary.main", sm: "background.paper" },
                        color: { xs: "primary.contrastText", sm: "text.primary" },
                    }}
                >
                    <IconButton
                        onClick={handleCloseDetail}
                        aria-label="Đóng"
                        sx={{ display: { xs: "inline-flex", sm: "none" }, position: "absolute", right: 8, top: 8, color: "primary.contrastText" }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Box sx={{ pr: { xs: 5, sm: 0 } }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, flexWrap: "wrap", width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "space-between", sm: "flex-end" } }}>
                            <StatusChip status={getDisplayStatus(detail)} />
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
                                {fmtMoney(detail.soTien)} {detail.maLoaiTien || "VND"}
                            </Typography>
                        </Box>
                    )}
                </DialogTitle>

                <DialogContent
                    dividers
                    sx={{
                        bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[50] : "background.default"),
                        p: { xs: 1.25, sm: 2.5 },
                    }}
                >
                    {!detail ? (
                        <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
                    ) : (
                        <Stack spacing={{ xs: 1.25, sm: 2.5 }}>
                            <Paper variant="outlined" sx={{ p: { xs: 1.35, sm: 2 }, borderRadius: { xs: 2.5, sm: 2 } }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Thông tin chung
                                </Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
                                        columnGap: 3,
                                        rowGap: 1.5,
                                    }}
                                >
                                    <DetailField label="Mã sổ séc">{detail.maSoSec || `SS-${detail.id}`}</DetailField>
                                    <DetailField label="Nội dung" sx={{ gridColumn: { sm: "span 2" } }}>{detail.noiDung}</DetailField>
                                    <DetailField label="Đơn vị hưởng thụ">
                                        {detail.tenDonVi || (donvis.find((d) => d.id === detail.donViId)?.name) || `ID: ${detail.donViId}`}
                                    </DetailField>
                                    <DetailField label="Số tài khoản hưởng thụ">{detail.soTaiKhoanHuongThu || donvis.find((d) => d.id === detail.donViId)?.stk}</DetailField>
                                    <DetailField label="Mã ngân hàng">{detail.maNganHangHuongThu || donvis.find((d) => d.id === detail.donViId)?.maNganHang}</DetailField>
                                    <DetailField label="Tên ngân hàng">{getTenNganHang(detail) || "—"}</DetailField>
                                    <DetailField label="Chi nhánh ngân hàng">{detail.chiNhanhNganHangHuongThu || donvis.find((d) => d.id === detail.donViId)?.chiNhanhNganHang}</DetailField>
                                    <DetailField label="Loại chi phí">{EXPENSE_LABELS[detail.maLoaiChiPhi] || detail.maLoaiChiPhi}</DetailField>
                                    <DetailField label="Loại tiền">{detail.maLoaiTien || "VND"}</DetailField>
                                    <DetailField label="Người đăng ký">{detail.tenNguoiTao}</DetailField>
                                    <DetailField label="Đơn vị người tạo">{detail.tenDonViNguoiTao}</DetailField>
                                    <DetailField label="Ghi chú" sx={{ gridColumn: { sm: "span 2", md: "span 3" } }}>{detail.ghiChu}</DetailField>
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: { xs: 1.35, sm: 2 }, borderRadius: { xs: 2.5, sm: 2 } }}>
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
                                        <>
                                            <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
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
                                            </Box>

                                            <Stack spacing={1} sx={{ display: { xs: "flex", sm: "none" } }}>
                                                {attachList.map((tl, idx) => (
                                                    <Paper key={tl.taiLieuId ?? tl.TaiLieuId ?? idx} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                                                        <Stack spacing={0.75}>
                                                            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", overflowWrap: "anywhere" }}>
                                                                {tl.fileName ?? tl.FileName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {(tl.nguoiTao ?? tl.NguoiTao) || "—"} · {isoToDisplay(tl.ngayTao ?? tl.NgayTao)}
                                                            </Typography>
                                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                <Button size="small" variant="outlined" onClick={() => handleViewAttachment(tl)}>
                                                                    Xem
                                                                </Button>
                                                                <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(tl)}>
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Stack>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </>
                                    )}
                                </Stack>
                            </Paper>

                            {canAddLenhChi && (
                                <Paper variant="outlined" sx={{ p: { xs: 1.35, sm: 2 }, borderRadius: { xs: 2.5, sm: 2 } }}>
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
                                <Paper variant="outlined" sx={{ p: { xs: 1.35, sm: 2 }, borderRadius: { xs: 2.5, sm: 2 } }}>
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

                            <Paper variant="outlined" sx={{ p: { xs: 1.35, sm: 2 }, borderRadius: { xs: 2.5, sm: 2 } }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Lịch sử duyệt
                                </Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                                        columnGap: 3,
                                        rowGap: 1.5,
                                    }}
                                >
                                    <DetailField label="TBP duyệt lúc">{isoToDisplay(detail.tbpTime)}</DetailField>
                                    <DetailField label="KTT duyệt lúc">{isoToDisplay(detail.kttTime)}</DetailField>
                                    <DetailField label="Giám đốc duyệt lúc">{isoToDisplay(detail.gdTime)}</DetailField>
                                    {detail.lyDoTraLai && (
                                        <DetailField label="Lý do trả lại" sx={{ gridColumn: { sm: "span 3" } }}>
                                            {detail.lyDoTraLai}
                                        </DetailField>
                                    )}
                                </Box>

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
                        px: { xs: 1.25, sm: 2.5 },
                        py: { xs: 1, sm: 1.5 },
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between",
                        gap: 1,
                        bgcolor: "background.paper",
                        "& .MuiStack-root": { width: { xs: "100%", sm: "auto" } },
                        "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                    }}
                >
                    {detail && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            {canEdit(detail) && (
                                <Button
                                    color="primary"
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={() => {
                                        handleCloseDetail();
                                        openEditDialog(detail);
                                    }}
                                >
                                    Sửa
                                </Button>
                            )}
                            {canReturn(detail) && (
                                <Button
                                    color="warning"
                                    variant="outlined"
                                    startIcon={<KeyboardReturnIcon />}
                                    onClick={() => openReturnDialog(detail)}
                                >
                                    Trả lại
                                </Button>
                            )}
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
                                disabled={!canReject(detail)}
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
            <Dialog open={openCreate} onClose={() => { setOpenCreate(false); resetForm(); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>{editingPhieu ? "Sửa" : "Tạo"} phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}</DialogTitle>
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
                                    return options.filter((o) => stripVN(
                                        [o?.name, o?.stk, o?.maNganHang, o?.tenNganHang, o?.chiNhanhNganHang].filter(Boolean).join(" ").toLowerCase()
                                    ).includes(q));
                                }}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id} sx={{ display: "block !important", py: 1 }}>
                                        <Typography>{option.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            STK: {option.stk || "—"} · Ma NH: {option.maNganHang || "—"} · Ten NH: {option.tenNganHang || "—"} · CN: {option.chiNhanhNganHang || "—"}
                                        </Typography>
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Đơn vị hưởng thụ"
                                        placeholder="Gõ tên đơn vị (không dấu)…"
                                        helperText={form.donViId
                                            ? `STK: ${donvis.find((d) => d.id === form.donViId)?.stk || "—"} · Ma NH: ${donvis.find((d) => d.id === form.donViId)?.maNganHang || "—"} · Ten NH: ${donvis.find((d) => d.id === form.donViId)?.tenNganHang || "—"} · CN: ${donvis.find((d) => d.id === form.donViId)?.chiNhanhNganHang || "—"}`
                                            : "Nhập tên, số tài khoản, mã ngân hàng hoặc chi nhánh để tìm."}
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

                        {isNgoaiTe ? (
                            <TextField
                                select
                                required
                                label="Loại tiền"
                                value={form.maLoaiTien}
                                onChange={(e) => setForm({ ...form, maLoaiTien: e.target.value })}
                            >
                                {currencies.filter((item) => item.MaLoaiTien !== "VND").map((item) => (
                                    <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>
                                        {item.MaLoaiTien} - {item.TenLoaiTien}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <TextField
                                select
                                required
                                label="Loại chi phí"
                                value={form.maLoaiChiPhi}
                                onChange={(e) => setForm({ ...form, maLoaiChiPhi: e.target.value })}
                            >
                                {Object.entries(EXPENSE_LABELS).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                            </TextField>
                        )}

                        <NumericFormat
                            customInput={TextField}
                            label={`Số tiền (${isNgoaiTe ? form.maLoaiTien || "ngoại tệ" : "VND"})`}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={3}
                            fixedDecimalScale
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
                    <Button onClick={() => { setOpenCreate(false); resetForm(); }}>Đóng</Button>
                    <Button variant="contained" onClick={submitCreate}>{editingPhieu ? "Cập nhật" : "Lưu"}</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openAddDv} onClose={() => setOpenAddDv(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>Thêm đơn vị hưởng thụ</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            autoFocus
                            label="Tên đơn vị (VD: Phòng Kế toán)"
                            value={dvName}
                            onChange={(e) => setDvName(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Số tài khoản (STK)"
                            value={dvStk}
                            onChange={(e) => setDvStk(e.target.value)}
                            fullWidth
                            required
                            placeholder="VD: 123456789"
                        />
                        <Autocomplete
                            options={banks}
                            value={banks.find((bank) => bank.MaNganHang === dvMaNH) || null}
                            onChange={(_, value) => setDvMaNH(value?.MaNganHang || "")}
                            getOptionLabel={(option) => (option ? `${option.MaNganHang} - ${option.TenNganHang}` : "")}
                            isOptionEqualToValue={(option, value) => option.MaNganHang === value.MaNganHang}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Ngan hang"
                                    required
                                    placeholder="Chon ma ngan hang"
                                />
                            )}
                            fullWidth
                        />
                        <TextField
                            label="Mã ngân hàng"
                            value={dvMaNH}
                            onChange={(e) => setDvMaNH(e.target.value)}
                            fullWidth
                            sx={{ display: "none" }}
                            required
                            placeholder="VD: VCB, BIDV, AGR..."
                        />
                        <TextField
                            label="Chi nhánh ngân hàng (không bắt buộc)"
                            value={dvChiNhanhNH}
                            onChange={(e) => setDvChiNhanhNH(e.target.value)}
                            fullWidth
                            placeholder="VD: Chi nhánh Hà Nội"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddDv(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        onClick={saveDonVi}
                        disabled={savingDv || !dvName.trim() || !dvStk.trim() || !banks.some((bank) => bank.MaNganHang === dvMaNH)}
                    >
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
            <Dialog
                open={rejectOpen}
                onClose={() => !rejectSubmitting && setRejectOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Từ chối phiếu</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        margin="dense"
                        label="Lý do từ chối"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectOpen(false)} disabled={rejectSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={submitReject}
                        disabled={rejectSubmitting || !rejectReason.trim()}
                    >
                        {rejectSubmitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={returnOpen}
                onClose={() => !returnSubmitting && setReturnOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Trả lại phiếu để chỉnh sửa</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        margin="dense"
                        label="Lý do trả lại"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnOpen(false)} disabled={returnSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        color="warning"
                        variant="contained"
                        onClick={submitReturn}
                        disabled={returnSubmitting || !returnReason.trim()}
                    >
                        {returnSubmitting ? "Đang xử lý..." : "Xác nhận trả lại"}
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
