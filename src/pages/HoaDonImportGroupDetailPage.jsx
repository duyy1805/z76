import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PreviewIcon from "@mui/icons-material/Preview";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import StatusChip from "../components/StatusChip";
import { api, hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    canApproveInvoice,
    canConfirmInvoiceExported,
    canDeleteInvoice,
    canDownloadUpdatedInvoice,
    canEditInvoiceAllInfo,
    canProcessInvoiceExportInfo,
    currencyAmountScale,
    fmtMoney,
    formatInvoiceDate,
    formatInvoiceDateTime,
    hasInvoicePermission,
    INVOICE_TYPE_LABELS,
    INVOICE_STATUS_OPTIONS,
    issuedInvoiceSymbol,
    PAYMENT_METHOD_OPTIONS,
    TAX_MODE_LABELS,
    VAT_RATE_OPTIONS,
    vatRateValue,
} from "../utils/hoa-don";
import { currentInvoicePath, safeInvoiceReturnTo, withInvoiceReturnTo } from "../utils/hoa-don-navigation";
import { applyUpdatedImportDateFormats, buildUpdatedImportRows, UPDATED_IMPORT_HEADERS } from "../utils/hoa-don-excel";
import TableHeaderFilter from "../components/hoa-don/TableHeaderFilter";

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

function safeExcelFileName(value) {
    return String(value || "nhom-import").replace(/[\\/:*?"<>|]+/g, "-").trim() || "nhom-import";
}

function todayDateInputValue() {
    const date = new Date();
    const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function normalizeSearch(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

function formatExcelPreviewCell(header, value) {
    if (value == null) return "";
    if (["Ngày hóa đơn", "Thời hạn thanh toán"].includes(header)) return formatInvoiceDate(value);

    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    if (header === "Số lượng") {
        return number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    }
    if (header === "Tỷ giá") return fmtMoney(number, 0);
    if (header === "Thuế suất GTGT (%)") {
        return number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    }
    if (["Tiền thuế GTGT quy đổi", "Thành tiền quy đổi"].includes(header)) {
        return fmtMoney(number, 0);
    }
    if (["Đơn giá", "Tiền thuế GTGT", "Thành tiền"].includes(header)) {
        return fmtMoney(number, 3);
    }
    return value;
}

function writeUpdatedExcelFile(rows, groupCode) {
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: UPDATED_IMPORT_HEADERS });
    applyUpdatedImportDateFormats(worksheet, rows);
    worksheet["!cols"] = UPDATED_IMPORT_HEADERS.map((header) => ({
        wch: Math.min(Math.max(header.length + 2, header.includes("Tên") || header === "Địa chỉ" ? 28 : 14), 42),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hóa đơn GTGT");
    XLSX.writeFile(workbook, `${safeExcelFileName(groupCode)}-da-cap-nhat.xlsx`);
}

function initialPreviewInfo(detail) {
    const taxCode = (line) => String(line?.MaThueSuatGTGT ?? line?.ThueSuatGTGT ?? "0");
    return {
        hinhThucThanhToan: detail?.hinhThucThanhToan || "Chuyển khoản",
        cheDoThue: detail?.cheDoThue || "MotThueSuat",
        maLoaiTien: detail?.maLoaiTien || "VND",
        tyGia: detail?.maLoaiTien === "VND" ? 1 : Number(detail?.tyGia || 1),
        thueSuatChung: taxCode(detail?.chiTiet?.[0]),
        chiTiet: (detail?.chiTiet || []).map((line) => ({ soDong: line.SoDong, thueSuatGTGT: taxCode(line) })),
    };
}

function previewDetailsWithEdits(details, infoById) {
    return details.map((detail) => {
        const info = infoById[detail.id];
        if (!info) return detail;
        const tyGia = info.maLoaiTien === "VND" ? 1 : Number(info.tyGia || 0);
        const lines = (detail.chiTiet || []).map((line) => {
            const code = String(info.cheDoThue === "NhieuThueSuat"
                ? info.chiTiet.find((item) => Number(item.soDong) === Number(line.SoDong))?.thueSuatGTGT ?? ""
                : info.thueSuatChung ?? "");
            const rate = vatRateValue(code);
            const tax = Number(line.ThanhTien || 0) * rate / 100;
            return {
                ...line,
                MaThueSuatGTGT: code,
                ThueSuatGTGT: rate,
                TienThue: tax,
                TienThueQuyDoi: tax * tyGia,
                ThanhTienQuyDoi: Number(line.ThanhTien || 0) * tyGia,
            };
        });
        return {
            ...detail,
            ...info,
            tyGia,
            chiTiet: lines,
            tongTienThue: lines.reduce((sum, line) => sum + Number(line.TienThue || 0), 0),
            tongTienThueQuyDoi: lines.reduce((sum, line) => sum + Number(line.TienThueQuyDoi || 0), 0),
        };
    });
}

function EditableExcelPreviewTable({ details, auth, infoById, selectedIds, setSelectedIds, setField, setLineTax, currencies }) {
    const toggleInvoice = (invoiceId) => setSelectedIds((current) => current.includes(invoiceId)
        ? current.filter((item) => item !== invoiceId)
        : [...current, invoiceId]);

    return (
        <Table stickyHeader size="small" sx={{ minWidth: 3450 }}>
            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox" sx={{ position: "sticky", left: 0, zIndex: 5, bgcolor: "background.paper" }} />
                    {UPDATED_IMPORT_HEADERS.map((header) => (
                        <TableCell key={header} sx={{ minWidth: header.includes("Tên") || header === "Địa chỉ" ? 240 : 135, whiteSpace: "nowrap", fontWeight: 750 }}>
                            {header}
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {details.flatMap((detail) => {
                    const rows = buildUpdatedImportRows([detail]);
                    rows.forEach((row) => {
                        row[UPDATED_IMPORT_HEADERS[0]] = detail.soThuTuTrongNhom || row[UPDATED_IMPORT_HEADERS[0]];
                    });
                    const editable = canProcessInvoiceExportInfo(detail, auth);
                    const selected = selectedIds.includes(detail.id);
                    const info = infoById[detail.id] || {};
                    return (detail.chiTiet || []).map((line, lineIndex) => {
                        const row = rows[lineIndex] || {};
                        const firstLine = lineIndex === 0;
                        return (
                            <TableRow key={`${detail.id}-${line.SoDong ?? lineIndex}`} hover selected={selected}>
                                <TableCell padding="checkbox" sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: selected ? "action.selected" : "background.paper" }}>
                                    {firstLine && <Checkbox size="small" checked={selected} disabled={!editable} onChange={() => toggleInvoice(detail.id)} />}
                                </TableCell>
                                {UPDATED_IMPORT_HEADERS.map((header) => {
                                    const cellSx = { whiteSpace: "nowrap", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" };
                                    const editableCell = editable && selected && ["Hình thức thanh toán", "Loại tiền", "Tỷ giá", "Thuế suất GTGT (%)"].includes(header);
                                    if (editableCell) cellSx.bgcolor = "rgba(25, 118, 210, 0.08)";
                                    let content = formatExcelPreviewCell(header, row[header]);
                                    if (editable && selected && firstLine && header === "Hình thức thanh toán") {
                                        content = <TextField select size="small" value={info.hinhThucThanhToan || ""} onChange={(event) => setField(detail.id, { hinhThucThanhToan: event.target.value })} sx={{ minWidth: 165 }}>{PAYMENT_METHOD_OPTIONS.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}</TextField>;
                                    } else if (editable && selected && firstLine && header === "Loại tiền") {
                                        content = <TextField select size="small" value={info.maLoaiTien || "VND"} onChange={(event) => setField(detail.id, { maLoaiTien: event.target.value, tyGia: event.target.value === "VND" ? 1 : info.tyGia })} sx={{ minWidth: 125 }}><MenuItem value="VND">VND</MenuItem>{currencies.filter((item) => item.MaLoaiTien !== "VND").map((item) => <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>{item.MaLoaiTien}</MenuItem>)}</TextField>;
                                    } else if (editable && selected && firstLine && header === "Tỷ giá") {
                                        content = <Stack direction="row" spacing={0.5}><TextField size="small" type="number" value={info.maLoaiTien === "VND" ? 1 : info.tyGia} disabled={info.maLoaiTien === "VND"} onChange={(event) => setField(detail.id, { tyGia: event.target.value })} sx={{ minWidth: 115 }} /><TextField select size="small" value={info.cheDoThue || "MotThueSuat"} onChange={(event) => setField(detail.id, { cheDoThue: event.target.value })} sx={{ minWidth: 145 }}>{Object.entries(TAX_MODE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Stack>;
                                    } else if (editable && selected && header === "Thuế suất GTGT (%)") {
                                        const taxValue = info.cheDoThue === "NhieuThueSuat" ? info.chiTiet?.find((item) => Number(item.soDong) === Number(line.SoDong))?.thueSuatGTGT ?? "" : info.thueSuatChung ?? "";
                                        content = <TextField select size="small" value={taxValue} onChange={(event) => info.cheDoThue === "NhieuThueSuat" ? setLineTax(detail.id, line.SoDong, event.target.value) : setField(detail.id, { thueSuatChung: event.target.value })} sx={{ minWidth: 95 }}>{VAT_RATE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>;
                                    }
                                    return <TableCell key={header} sx={cellSx} title={row[header] == null ? "" : String(row[header])}>{content}</TableCell>;
                                })}
                            </TableRow>
                        );
                    });
                })}
            </TableBody>
        </Table>
    );
}

export default function HoaDonImportGroupDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { user } = auth;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deletingInvoice, setDeletingInvoice] = useState(false);
    const [exportingUpdated, setExportingUpdated] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [previewingUpdated, setPreviewingUpdated] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewDetails, setPreviewDetails] = useState([]);
    const [previewInfo, setPreviewInfo] = useState({});
    const [previewSelectedIds, setPreviewSelectedIds] = useState([]);
    const [previewResults, setPreviewResults] = useState(null);
    const [savingPreview, setSavingPreview] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [confirmExportOpen, setConfirmExportOpen] = useState(false);
    const [confirmExportInfo, setConfirmExportInfo] = useState({});
    const [confirmingExported, setConfirmingExported] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [returningInvoices, setReturningInvoices] = useState(false);
    const [tableFilters, setTableFilters] = useState({ stt: "", code: "", type: "", buyer: "", buyerContact: "", dateFrom: "", dateTo: "", amountFrom: "", amountTo: "", status: "", completion: "" });
    const setTableFilter = (patch) => setTableFilters((current) => ({ ...current, ...patch }));
    const listReturnTo = safeInvoiceReturnTo(
        new URLSearchParams(location.search).get("returnTo"),
        "/hoa-don-dien-tu?tab=groups"
    );
    const groupReturnTo = currentInvoicePath(location);
    const navigateFromGroup = (target) => navigate(withInvoiceReturnTo(target, groupReturnTo));

    const load = useCallback(async () => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            setData(await hoaDonApi.getNhomImport(id, user));
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được chi tiết nhóm import." });
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        api.listLoaiTien({ tontai: 1 }).then((rows) => setCurrencies(rows || [])).catch(() => setCurrencies([]));
    }, []);

    useEffect(() => {
        if (!location.state?.toast) return;
        setToast({ open: true, ...location.state.toast });
        navigate(groupReturnTo, { replace: true, state: {} });
    }, [groupReturnTo, location.state, navigate]);

    const invoices = useMemo(() => data?.invoices || [], [data?.invoices]);
    const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
        const invoiceDate = String(invoice.ngayHoaDon || "").slice(0, 10);
        const amount = Number(invoice.tongTienThanhToan || 0);
        const buyerText = normalizeSearch([invoice.tenNguoiMua, invoice.maSoThue, invoice.maDvcqhns].filter(Boolean).join(" "));
        return (!tableFilters.stt || String(invoice.soThuTuTrongNhom || "").includes(tableFilters.stt.trim()))
            && (!tableFilters.code || normalizeSearch(invoice.maDangKy).includes(normalizeSearch(tableFilters.code)))
            && (!tableFilters.type || invoice.maLoaiHoaDon === tableFilters.type)
            && (!tableFilters.buyer || buyerText.includes(normalizeSearch(tableFilters.buyer)))
            && (!tableFilters.buyerContact || normalizeSearch(invoice.nguoiLienHe).includes(normalizeSearch(tableFilters.buyerContact)))
            && (!tableFilters.dateFrom || invoiceDate >= tableFilters.dateFrom)
            && (!tableFilters.dateTo || invoiceDate <= tableFilters.dateTo)
            && (tableFilters.amountFrom === "" || amount >= Number(tableFilters.amountFrom))
            && (tableFilters.amountTo === "" || amount <= Number(tableFilters.amountTo))
            && (!tableFilters.status || invoice.maTrangThai === tableFilters.status)
            && (!tableFilters.completion || (tableFilters.completion === "incomplete") === Boolean(invoice.isImportIncomplete));
    }), [invoices, tableFilters]);
    const canSubmitGroup = useMemo(() => {
        const isOwner = Number(data?.group?.nguoiTaoId) === Number(user?.id);
        return invoices.some((invoice) => invoice.maTrangThai === "KhoiTao") && (isOwner || hasInvoicePermission(auth, "HD_Admin"));
    }, [auth, data?.group?.nguoiTaoId, invoices, user?.id]);
    const isAdmin = hasInvoicePermission(auth, "HD_Admin");
    const isGroupOwner = Number(data?.group?.nguoiTaoId) === Number(user?.id);
    const canApproveGroup = useMemo(() => invoices.some((invoice) => canApproveInvoice(invoice, auth)), [auth, invoices]);
    const confirmableInvoices = useMemo(() => invoices.filter((invoice) => canConfirmInvoiceExported(invoice, auth)), [auth, invoices]);
    const downloadableInvoices = useMemo(() => invoices.filter((invoice) => canDownloadUpdatedInvoice(invoice, auth)), [auth, invoices]);
    const editablePreviewInvoices = useMemo(() => invoices.filter((invoice) => canProcessInvoiceExportInfo(invoice, auth)), [auth, invoices]);
    const previewableInvoices = useMemo(() => invoices.filter((invoice) => canProcessInvoiceExportInfo(invoice, auth) || canDownloadUpdatedInvoice(invoice, auth)), [auth, invoices]);
    const selectedConfirmableInvoices = confirmableInvoices.filter((invoice) => selectedIds.includes(invoice.id));
    const selectedDownloadableInvoices = downloadableInvoices.filter((invoice) => selectedIds.includes(invoice.id));
    const selectedReturnableInvoices = editablePreviewInvoices.filter((invoice) => selectedIds.includes(invoice.id));
    const selectableInvoices = useMemo(() => invoices.filter((invoice) => canProcessInvoiceExportInfo(invoice, auth) || canDownloadUpdatedInvoice(invoice, auth)), [auth, invoices]);
    const filteredSelectableIds = filteredInvoices.filter((invoice) => canProcessInvoiceExportInfo(invoice, auth) || canDownloadUpdatedInvoice(invoice, auth)).map((invoice) => invoice.id);
    const selectedFilteredCount = filteredSelectableIds.filter((invoiceId) => selectedIds.includes(invoiceId)).length;
    const allFilteredSelected = filteredSelectableIds.length > 0 && selectedFilteredCount === filteredSelectableIds.length;
    const someFilteredSelected = selectedFilteredCount > 0 && !allFilteredSelected;
    const canDeleteGroup = isAdmin || (isGroupOwner && invoices.every((invoice) => invoice.maTrangThai === "KhoiTao"));

    useEffect(() => {
        const eligibleIds = new Set(selectableInvoices.map((invoice) => invoice.id));
        setSelectedIds((current) => {
            const next = current.filter((invoiceId) => eligibleIds.has(invoiceId));
            return next.length === current.length ? current : next;
        });
    }, [selectableInvoices]);

    const toggleSelectedInvoice = (invoiceId) => {
        setSelectedIds((current) => current.includes(invoiceId)
            ? current.filter((idToKeep) => idToKeep !== invoiceId)
            : [...current, invoiceId]);
    };

    const toggleFilteredInvoices = () => {
        setSelectedIds((current) => allFilteredSelected
            ? current.filter((invoiceId) => !filteredSelectableIds.includes(invoiceId))
            : [...new Set([...current, ...filteredSelectableIds])]);
    };

    const returnSelectedInvoices = async () => {
        const ghiChu = returnReason.trim();
        if (!ghiChu) {
            setToast({ open: true, type: "warning", msg: "Nhập lý do trả lại các hóa đơn đã chọn." });
            return;
        }
        setReturningInvoices(true);
        setResult(null);
        try {
            const settled = await Promise.allSettled(selectedReturnableInvoices.map((invoice) => hoaDonApi.approveHoaDon(invoice.id, {
                hanhDong: "TraLai",
                user,
                ghiChu,
            })));
            const processed = [];
            const skipped = [];
            selectedReturnableInvoices.forEach((invoice, index) => {
                const item = settled[index];
                if (item.status === "fulfilled") processed.push({ hoaDonId: invoice.id, maDangKy: invoice.maDangKy });
                else skipped.push({ hoaDonId: invoice.id, maDangKy: invoice.maDangKy, reason: item.reason?.response?.data?.message || item.reason?.message || "Trả lại thất bại." });
            });
            const processedIds = new Set(processed.map((item) => item.hoaDonId));
            setSelectedIds((current) => current.filter((invoiceId) => !processedIds.has(invoiceId)));
            setResult({ processed, skipped });
            setReturnDialogOpen(false);
            setReturnReason("");
            setToast({
                open: true,
                type: skipped.length ? "warning" : "success",
                msg: `Đã trả lại ${processed.length} hóa đơn; ${skipped.length} hóa đơn chưa xử lý được.`,
            });
            await load();
        } finally {
            setReturningInvoices(false);
        }
    };

    const runBulk = async (action) => {
        setRunning(true);
        setResult(null);
        try {
            const response = action === "submit"
                ? await hoaDonApi.submitNhomImport(id, user)
                : await hoaDonApi.approveNhomImport(id, user);
            setResult(response);
            setToast({
                open: true,
                type: response.processed?.length ? "success" : "warning",
                msg: `Đã xử lý ${response.processed?.length || 0} hóa đơn; bỏ qua ${response.skipped?.length || 0} hóa đơn.`,
            });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Thao tác nhóm thất bại." });
        } finally {
            setRunning(false);
        }
    };

    const loadUpdatedExcelRows = async () => {
        if (!selectedDownloadableInvoices.length) throw new Error("Chọn ít nhất một hóa đơn Sẵn sàng xuất hoặc Đã xuất.");
        const details = await mapWithConcurrency(selectedDownloadableInvoices, 5, (invoice) => hoaDonApi.getHoaDon(invoice.id, {
                userId: user.id,
                idDonVi: user.idDonVi,
        }));
        const rows = buildUpdatedImportRows(details);
        if (!rows.length) throw new Error("Nhóm không có dòng hàng hóa để xuất Excel.");
        return { details, rows };
    };

    const downloadUpdatedExcel = async () => {
        if (!selectedDownloadableInvoices.length) return;
        setExportingUpdated(true);
        try {
            const { details, rows } = await loadUpdatedExcelRows();
            writeUpdatedExcelFile(rows, data?.group?.maNhom);
            setToast({ open: true, type: "success", msg: `Đã tạo file Excel từ dữ liệu mới nhất của ${details.length} hóa đơn.` });
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Không thể tạo file Excel cập nhật." });
        } finally {
            setExportingUpdated(false);
        }
    };

    const previewDisplayDetails = useMemo(() => previewDetailsWithEdits(previewDetails, previewInfo), [previewDetails, previewInfo]);
    const previewRows = useMemo(() => buildUpdatedImportRows(previewDisplayDetails), [previewDisplayDetails]);

    const openUpdatedExcelPreview = async () => {
        if (!previewableInvoices.length) return;
        setPreviewingUpdated(true);
        try {
            const details = await mapWithConcurrency(previewableInvoices, 5, (invoice) => hoaDonApi.getHoaDon(invoice.id, {
                userId: user.id,
                idDonVi: user.idDonVi,
            }));
            const editableIds = details.filter((detail) => canProcessInvoiceExportInfo(detail, auth)).map((detail) => detail.id);
            setPreviewDetails(details);
            setPreviewInfo(Object.fromEntries(details.map((detail) => [detail.id, initialPreviewInfo(detail)])));
            setPreviewSelectedIds(editableIds);
            setPreviewResults(null);
            setPreviewOpen(true);
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Không thể xem trước file Excel." });
        } finally {
            setPreviewingUpdated(false);
        }
    };

    const downloadPreviewedExcel = () => {
        const downloadableDetails = previewDisplayDetails.filter((detail) => canDownloadUpdatedInvoice(detail, auth));
        writeUpdatedExcelFile(buildUpdatedImportRows(downloadableDetails), data?.group?.maNhom);
        setToast({ open: true, type: "success", msg: "Đã tạo file Excel theo nội dung xem trước." });
    };

    const setPreviewField = (invoiceId, patch) => setPreviewInfo((current) => {
        if (Object.prototype.hasOwnProperty.call(patch, "tyGia")) {
            const selectedSet = new Set(previewSelectedIds.map(Number));
            return Object.fromEntries(Object.entries(current).map(([id, info]) => [
                id,
                selectedSet.has(Number(id)) && info.maLoaiTien !== "VND"
                    ? { ...info, tyGia: patch.tyGia }
                    : info,
            ]));
        }
        return {
            ...current,
            [invoiceId]: { ...current[invoiceId], ...patch },
        };
    });

    const setPreviewLineTax = (invoiceId, soDong, value) => setPreviewInfo((current) => ({
        ...current,
        [invoiceId]: {
            ...current[invoiceId],
            chiTiet: current[invoiceId].chiTiet.map((line) => Number(line.soDong) === Number(soDong) ? { ...line, thueSuatGTGT: value } : line),
        },
    }));

    const savePreview = async (action) => {
        const selected = previewDetails.filter((detail) => previewSelectedIds.includes(detail.id) && canProcessInvoiceExportInfo(detail, auth));
        if (!selected.length) {
            setToast({ open: true, type: "warning", msg: "Chọn ít nhất một hóa đơn đang chờ phụ trách." });
            return;
        }
        setSavingPreview(true);
        setPreviewResults(null);
        try {
            const response = await hoaDonApi.updateNhomImportExportInfo(id, {
                action,
                items: selected.map((detail) => ({ hoaDonId: detail.id, ...previewInfo[detail.id] })),
            }, user);
            setPreviewResults(response);
            setToast({
                open: true,
                type: response.skipped?.length ? "warning" : "success",
                msg: `Đã xử lý ${response.processed?.length || 0} hóa đơn; bỏ qua ${response.skipped?.length || 0} hóa đơn.`,
            });
            const succeededIds = new Set((response.processed || []).map((item) => Number(item.hoaDonId || item.id)));
            setPreviewSelectedIds((current) => current.filter((invoiceId) => !succeededIds.has(Number(invoiceId))));
            setPreviewDetails((current) => current.map((detail) => {
                if (!succeededIds.has(Number(detail.id))) return detail;
                const edited = previewDetailsWithEdits([detail], previewInfo)[0];
                return action === "save_and_approve" ? { ...edited, maTrangThai: "SanSangXuat" } : edited;
            }));
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không thể cập nhật thông tin xuất hóa đơn." });
        } finally {
            setSavingPreview(false);
        }
    };

    const openConfirmExportDialog = () => {
        const today = todayDateInputValue();
        setConfirmExportInfo(Object.fromEntries(selectedConfirmableInvoices.map((invoice) => [
            invoice.id,
            {
                soHoaDon: invoice.soHoaDon || "",
                kyHieuHoaDon: issuedInvoiceSymbol(invoice),
                ngayPhatHanh: invoice.ngayPhatHanh ? String(invoice.ngayPhatHanh).slice(0, 10) : today,
            },
        ])));
        setConfirmExportOpen(true);
    };

    const setConfirmExportField = (hoaDonId, patch) => {
        setConfirmExportInfo((current) => ({
            ...current,
            [hoaDonId]: { ...(current[hoaDonId] || {}), ...patch },
        }));
    };

    const confirmGroupExported = async () => {
        const missingInfo = selectedConfirmableInvoices.some((invoice) => {
            const info = confirmExportInfo[invoice.id] || {};
            return !String(info.kyHieuHoaDon || "").trim() ||
                !String(info.ngayPhatHanh || "").trim();
        });
        if (!selectedConfirmableInvoices.length || missingInfo) {
            setToast({ open: true, type: "warning", msg: "Nhập đủ ký hiệu và ngày phát hành cho các hóa đơn đã chọn." });
            return;
        }

        setConfirmingExported(true);
        try {
            const results = await Promise.allSettled(selectedConfirmableInvoices.map((invoice) => {
                const info = confirmExportInfo[invoice.id];
                return hoaDonApi.confirmHoaDonExported(invoice.id, {
                    soHoaDon: String(info.soHoaDon).trim(),
                    kyHieuHoaDon: String(info.kyHieuHoaDon).trim(),
                    ngayPhatHanh: info.ngayPhatHanh,
                }, user);
            }));
            const succeeded = results.filter((item) => item.status === "fulfilled").length;
            const failed = results.length - succeeded;
            const firstFailureIndex = results.findIndex((item) => item.status === "rejected");
            const firstFailure = firstFailureIndex >= 0 ? results[firstFailureIndex] : null;
            const firstFailureInvoice = firstFailureIndex >= 0 ? selectedConfirmableInvoices[firstFailureIndex] : null;
            const firstFailureReason = firstFailure?.reason?.response?.data?.message || firstFailure?.reason?.message || "Không xác định được nguyên nhân.";
            const succeededIds = new Set(selectedConfirmableInvoices.filter((_, index) => results[index].status === "fulfilled").map((invoice) => invoice.id));
            setSelectedIds((current) => current.filter((invoiceId) => !succeededIds.has(invoiceId)));
            if (!failed) {
                setConfirmExportOpen(false);
                setConfirmExportInfo({});
            }
            setToast({
                open: true,
                type: failed ? "warning" : "success",
                msg: failed
                    ? `Đã xác nhận ${succeeded} hóa đơn; ${failed} hóa đơn chưa chuyển được trạng thái. ${firstFailureInvoice?.maDangKy || "Hóa đơn đầu tiên lỗi"}: ${firstFailureReason}`
                    : `Đã xác nhận ${succeeded} hóa đơn đã xuất; trạng thái nhóm đã được cập nhật.`,
            });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || error?.message || "Xác nhận hóa đơn đã xuất thất bại." });
        } finally {
            setConfirmingExported(false);
        }
    };

    const confirmDeleteGroup = async () => {
        setDeletingGroup(true);
        try {
            const response = await hoaDonApi.deleteNhomImport(id, user);
            navigate(listReturnTo, {
                replace: true,
                state: {
                    toast: {
                        type: "success",
                        msg: `Đã xóa nhóm ${data?.group?.maNhom || "import"}, ${response.deletedInvoiceCount || 0} hóa đơn và các file liên quan.`,
                    },
                },
            });
        } catch (error) {
            setConfirmDeleteOpen(false);
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa nhóm import thất bại." });
        } finally {
            setDeletingGroup(false);
        }
    };

    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete?.id) return;
        setDeletingInvoice(true);
        try {
            await hoaDonApi.deleteHoaDon(invoiceToDelete.id, user);
            setSelectedIds((current) => current.filter((invoiceId) => invoiceId !== invoiceToDelete.id));
            setInvoiceToDelete(null);
            setToast({ open: true, type: "success", msg: `Đã xóa hóa đơn ${invoiceToDelete.maDangKy}.` });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa hóa đơn thất bại." });
        } finally {
            setDeletingInvoice(false);
        }
    };

    if (loading && !data) {
        return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
    }

    const group = data?.group;
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 1.25 }, minHeight: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
                <Box sx={{ minWidth: 220, flexShrink: 0 }}>
                    <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(listReturnTo)}>Danh sách nhóm import</Button>
                    <Typography variant="h5" sx={{ mt: 0.25 }}>{group?.maNhom || "Nhóm import"}</Typography>
                    <Typography variant="body2" color="text.secondary">{group?.fileName} · {group?.soHoaDon || 0} hóa đơn · {formatInvoiceDateTime(group?.ngayTao)}</Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent={{ md: "flex-end" }}>
                    <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={() => { window.location.href = hoaDonApi.getNhomImportFileUrl(id, user); }}>Tải file gốc</Button>
                    <Button size="small" startIcon={<PreviewIcon />} color="secondary" variant="outlined" disabled={!previewableInvoices.length || previewingUpdated} onClick={openUpdatedExcelPreview}>
                        {previewingUpdated ? "Đang tải dữ liệu..." : `Xem & cập nhật (${previewableInvoices.length})`}
                    </Button>
                    <Button size="small" startIcon={<DownloadIcon />} color="secondary" variant="contained" disabled={!selectedDownloadableInvoices.length || exportingUpdated} onClick={downloadUpdatedExcel}>
                        {exportingUpdated ? "Đang tạo Excel..." : `Tải Excel đã cập nhật (${selectedDownloadableInvoices.length})`}
                    </Button>
                    <Button size="small" startIcon={<SendIcon />} variant="contained" disabled={!canSubmitGroup || running} onClick={() => runBulk("submit")}>Trình phần hợp lệ</Button>
                    <Button size="small" startIcon={<KeyboardReturnIcon />} color="warning" variant="outlined" disabled={!selectedReturnableInvoices.length || running || returningInvoices} onClick={() => setReturnDialogOpen(true)}>
                        Trả lại đã chọn ({selectedReturnableInvoices.length})
                    </Button>
                    <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={!canApproveGroup || running} onClick={() => runBulk("approve")}>Duyệt phần hợp lệ</Button>
                    <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={!selectedConfirmableInvoices.length || running || confirmingExported} onClick={openConfirmExportDialog}>
                        Xác nhận đã xuất ({selectedConfirmableInvoices.length})
                    </Button>
                    {canDeleteGroup && (
                        <Button size="small" startIcon={<DeleteOutlineIcon />} color="error" variant="outlined" disabled={running} onClick={() => setConfirmDeleteOpen(true)}>
                            Xóa nhóm
                        </Button>
                    )}
                </Stack>
            </Stack>

            {result && (
                <Alert severity={result.skipped?.length ? "warning" : "success"} onClose={() => setResult(null)}>
                    <Typography sx={{ fontWeight: 700 }}>Đã xử lý {result.processed?.length || 0}, bỏ qua {result.skipped?.length || 0} hóa đơn.</Typography>
                    {(result.skipped || []).slice(0, 10).map((item) => (
                        <Typography key={item.hoaDonId} variant="body2">Hóa đơn {item.maDangKy || `#${item.hoaDonId}`}: {item.reason}</Typography>
                    ))}
                </Alert>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 3, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1240 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="none" align="center" sx={{ width: 58, minWidth: 58 }}>
                                <Checkbox size="small" sx={{ p: 0.75 }} checked={allFilteredSelected} indeterminate={someFilteredSelected} disabled={!filteredSelectableIds.length} onChange={toggleFilteredInvoices} inputProps={{ "aria-label": "Chọn tất cả hóa đơn có thể xử lý đang hiển thị" }} />
                            </TableCell>
                            <TableCell align="center" sx={{ width: 90 }} title="Số thứ tự hóa đơn (*)"><TableHeaderFilter label="STT" align="center" active={Boolean(tableFilters.stt)} onClear={() => setTableFilter({ stt: "" })}><TextField autoFocus size="small" label="Số thứ tự hóa đơn" value={tableFilters.stt} onChange={(event) => setTableFilter({ stt: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Mã đăng ký" active={Boolean(tableFilters.code)} onClear={() => setTableFilter({ code: "" })}><TextField autoFocus size="small" label="Mã đăng ký" value={tableFilters.code} onChange={(event) => setTableFilter({ code: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Loại hóa đơn" active={Boolean(tableFilters.type)} onClear={() => setTableFilter({ type: "" })}><TextField select size="small" label="Loại hóa đơn" value={tableFilters.type} onChange={(event) => setTableFilter({ type: event.target.value })}><MenuItem value="">Tất cả</MenuItem>{Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Tên đơn vị mua hàng" active={Boolean(tableFilters.buyer)} width={320} onClear={() => setTableFilter({ buyer: "" })}><TextField autoFocus size="small" label="Tên hoặc mã định danh" value={tableFilters.buyer} onChange={(event) => setTableFilter({ buyer: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Người mua hàng" active={Boolean(tableFilters.buyerContact)} onClear={() => setTableFilter({ buyerContact: "" })}><TextField autoFocus size="small" label="Người mua hàng" value={tableFilters.buyerContact} onChange={(event) => setTableFilter({ buyerContact: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Ngày hóa đơn" active={Boolean(tableFilters.dateFrom || tableFilters.dateTo)} onClear={() => setTableFilter({ dateFrom: "", dateTo: "" })}><TextField size="small" type="date" label="Từ ngày" value={tableFilters.dateFrom} onChange={(event) => setTableFilter({ dateFrom: event.target.value })} InputLabelProps={{ shrink: true }} /><TextField size="small" type="date" label="Đến ngày" value={tableFilters.dateTo} onChange={(event) => setTableFilter({ dateTo: event.target.value })} InputLabelProps={{ shrink: true }} /></TableHeaderFilter></TableCell>
                            <TableCell align="right"><TableHeaderFilter label="Tổng tiền ngoại tệ" align="right" active={Boolean(tableFilters.amountFrom || tableFilters.amountTo)} onClear={() => setTableFilter({ amountFrom: "", amountTo: "" })}><TextField size="small" type="number" label="Từ số tiền" value={tableFilters.amountFrom} onChange={(event) => setTableFilter({ amountFrom: event.target.value })} /><TextField size="small" type="number" label="Đến số tiền" value={tableFilters.amountTo} onChange={(event) => setTableFilter({ amountTo: event.target.value })} /></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Trạng thái" active={Boolean(tableFilters.status)} onClear={() => setTableFilter({ status: "" })}><TextField select size="small" label="Trạng thái" value={tableFilters.status} onChange={(event) => setTableFilter({ status: event.target.value })}><MenuItem value="">Tất cả</MenuItem>{INVOICE_STATUS_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></TableHeaderFilter></TableCell>
                            <TableCell><TableHeaderFilter label="Hoàn thiện" active={Boolean(tableFilters.completion)} onClear={() => setTableFilter({ completion: "" })}><TextField select size="small" label="Mức hoàn thiện" value={tableFilters.completion} onChange={(event) => setTableFilter({ completion: event.target.value })}><MenuItem value="">Tất cả</MenuItem><MenuItem value="complete">Đủ thông tin</MenuItem><MenuItem value="incomplete">Cần bổ sung</MenuItem></TextField></TableHeaderFilter></TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInvoices.map((invoice) => (
                            <TableRow key={invoice.id} hover>
                                <TableCell padding="none" align="center" sx={{ width: 58, minWidth: 58 }}>
                                    <Checkbox size="small" sx={{ p: 0.75 }} checked={selectedIds.includes(invoice.id)} disabled={!canProcessInvoiceExportInfo(invoice, auth) && !canDownloadUpdatedInvoice(invoice, auth)} onChange={() => toggleSelectedInvoice(invoice.id)} inputProps={{ "aria-label": `Chọn hóa đơn ${invoice.maDangKy}` }} />
                                </TableCell>
                                <TableCell align="center">{invoice.soThuTuTrongNhom}</TableCell>
                                <TableCell sx={{ fontWeight: 750 }}>{invoice.maDangKy}</TableCell>
                                <TableCell>{INVOICE_TYPE_LABELS[invoice.maLoaiHoaDon] || invoice.maLoaiHoaDon || "Chưa bổ sung"}</TableCell>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 650 }}>{invoice.tenNguoiMua || "Chưa bổ sung"}</Typography>
                                    <Typography variant="caption" color="text.secondary">{invoice.maSoThue || invoice.maDvcqhns || "Chưa có mã định danh"}</Typography>
                                </TableCell>
                                <TableCell>{invoice.nguoiLienHe || "—"}</TableCell>
                                <TableCell>{formatInvoiceDate(invoice.ngayHoaDon)}</TableCell>
                                <TableCell align="right">{fmtMoney(invoice.tongTienThanhToan, currencyAmountScale(invoice.maLoaiTien), invoice.maLoaiTien)} {invoice.maLoaiTien}</TableCell>
                                <TableCell><StatusChip status={invoice.maTrangThai} /></TableCell>
                                <TableCell><Chip size="small" color={invoice.isImportIncomplete ? "warning" : "success"} label={invoice.isImportIncomplete ? "Cần bổ sung" : "Đủ thông tin"} /></TableCell>
                                <TableCell align="right">
                                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigateFromGroup(`/hoa-don-dien-tu/${invoice.id}`)}>Xem</Button>
                                    {canEditInvoiceAllInfo(invoice, auth) && <Button size="small" startIcon={<EditIcon />} onClick={() => navigateFromGroup(`/hoa-don-dien-tu/${invoice.id}/edit`)}>Sửa</Button>}
                                    {canDeleteInvoice(invoice, auth) && (isAdmin || invoice.maTrangThai === "KhoiTao") && (
                                        <IconButton size="small" color="error" aria-label={`Xóa hóa đơn ${invoice.maDangKy}`} onClick={() => setInvoiceToDelete(invoice)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!filteredInvoices.length && <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6 }}>{invoices.length ? "Không có hóa đơn phù hợp bộ lọc." : "Không có hóa đơn bạn được phép xem trong nhóm này."}</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((current) => ({ ...current, open: false }))}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>

            <Dialog open={previewOpen} onClose={() => !savingPreview && setPreviewOpen(false)} maxWidth={false} fullWidth PaperProps={{ sx: { width: "calc(100vw - 48px)", height: "calc(100vh - 48px)", maxWidth: "none" } }}>
                <DialogTitle>
                    Xem và cập nhật thông tin xuất hóa đơn
                    <Typography variant="body2" color="text.secondary">
                        {UPDATED_IMPORT_HEADERS.length} cột · {previewRows.length} dòng dữ liệu · ô nền xanh có thể chỉnh sửa
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0, display: "flex", minHeight: 0 }}>
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                        {previewResults && (
                            <Alert severity={previewResults.skipped?.length ? "warning" : "success"} sx={{ borderRadius: 0 }}>
                                Đã xử lý {previewResults.processed?.length || 0}, bỏ qua {previewResults.skipped?.length || 0} hóa đơn.
                                {(previewResults.skipped || []).map((item) => <Typography key={item.hoaDonId} variant="body2">{item.maDangKy || `#${item.hoaDonId}`}: {item.reason}</Typography>)}
                            </Alert>
                        )}
                        <Box sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                            <Checkbox
                                size="small"
                                checked={editablePreviewInvoices.length > 0 && editablePreviewInvoices.every((invoice) => previewSelectedIds.includes(invoice.id))}
                                indeterminate={previewSelectedIds.length > 0 && !editablePreviewInvoices.every((invoice) => previewSelectedIds.includes(invoice.id))}
                                onChange={(event) => setPreviewSelectedIds(event.target.checked ? editablePreviewInvoices.map((invoice) => invoice.id) : [])}
                            />
                            <Typography component="span" variant="body2">Chọn tất cả hóa đơn đang chờ phụ trách ({editablePreviewInvoices.length})</Typography>
                        </Box>
                        <TableContainer sx={{ flex: 1 }}>
                            <EditableExcelPreviewTable
                                details={previewDisplayDetails}
                                auth={auth}
                                infoById={previewInfo}
                                selectedIds={previewSelectedIds}
                                setSelectedIds={setPreviewSelectedIds}
                                setField={setPreviewField}
                                setLineTax={setPreviewLineTax}
                                currencies={currencies}
                            />
                        </TableContainer>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)} disabled={savingPreview}>Đóng</Button>
                    <Button variant="outlined" disabled={savingPreview || !previewSelectedIds.length} onClick={() => savePreview("save")}>Lưu thay đổi</Button>
                    <Button color="success" variant="contained" disabled={savingPreview || !previewSelectedIds.length} onClick={() => savePreview("save_and_approve")}>{savingPreview ? "Đang xử lý..." : "Lưu & duyệt đã chọn"}</Button>
                    <Button startIcon={<DownloadIcon />} color="secondary" variant="contained" disabled={!previewDisplayDetails.some((detail) => canDownloadUpdatedInvoice(detail, auth))} onClick={downloadPreviewedExcel}>Tải Excel đã cập nhật</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={returnDialogOpen} onClose={() => !returningInvoices && setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Trả lại {selectedReturnableInvoices.length} hóa đơn đã chọn?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Các hóa đơn sẽ được chuyển về trạng thái Nháp để người đăng ký chỉnh sửa. Một lý do chung sẽ được ghi nhận cho toàn bộ hóa đơn đã chọn.
                    </Typography>
                    <TextField
                        autoFocus
                        required
                        multiline
                        minRows={3}
                        fullWidth
                        label="Lý do trả lại"
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                        disabled={returningInvoices}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnDialogOpen(false)} disabled={returningInvoices}>Đóng</Button>
                    <Button color="warning" variant="contained" startIcon={<KeyboardReturnIcon />} onClick={returnSelectedInvoices} disabled={returningInvoices || !returnReason.trim() || !selectedReturnableInvoices.length}>
                        {returningInvoices ? "Đang trả lại..." : "Trả lại đã chọn"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onClose={() => !deletingGroup && setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa nhóm import?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        {isAdmin
                            ? `Nhóm ${group?.maNhom || "này"}, toàn bộ hóa đơn trong nhóm (kể cả hóa đơn đã trình hoặc Đã xuất), file Excel gốc và mọi file đính kèm sẽ bị xóa.`
                            : `Nhóm ${group?.maNhom || "này"}, toàn bộ hóa đơn Nháp, file Excel gốc và mọi file đính kèm sẽ bị xóa.`}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deletingGroup}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDeleteGroup} disabled={deletingGroup}>
                        {deletingGroup ? "Đang xóa..." : "Xóa nhóm"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(invoiceToDelete)} onClose={() => !deletingInvoice && setInvoiceToDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa hóa đơn?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Hóa đơn {invoiceToDelete?.maDangKy || "này"} sẽ bị xóa khỏi nhóm và các file đính kèm sẽ bị xóa khỏi vùng lưu trữ.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvoiceToDelete(null)} disabled={deletingInvoice}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDeleteInvoice} disabled={deletingInvoice}>
                        {deletingInvoice ? "Đang xóa..." : "Xóa hóa đơn"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmExportOpen} onClose={() => !confirmingExported && setConfirmExportOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Xác nhận hóa đơn trong nhóm đã xuất?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Nhập thông tin phát hành để chuyển {selectedConfirmableInvoices.length} hóa đơn đã chọn từ Sẵn sàng xuất sang Đã xuất.
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 460, overflow: "auto", pr: 0.5 }}>
                        {selectedConfirmableInvoices.map((invoice) => {
                            const info = confirmExportInfo[invoice.id] || {};
                            return (
                                <Box
                                    key={invoice.id}
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 1.4fr) minmax(170px, .8fr) minmax(190px, .8fr) minmax(190px, .8fr)" },
                                        gap: 1.25,
                                        alignItems: "start",
                                        p: 1.25,
                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700 }}>{invoice.maDangKy}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                            {invoice.tenNguoiMua || "—"}
                                        </Typography>
                                    </Box>
                                    <TextField size="small" label="Số hóa đơn (không bắt buộc)" value={info.soHoaDon || ""} onChange={(event) => setConfirmExportField(invoice.id, { soHoaDon: event.target.value })} />
                                    <TextField size="small" required label="Ký hiệu" value={info.kyHieuHoaDon || ""} onChange={(event) => setConfirmExportField(invoice.id, { kyHieuHoaDon: event.target.value })} />
                                    <TextField size="small" required type="date" label="Ngày phát hành" value={info.ngayPhatHanh || ""} onChange={(event) => setConfirmExportField(invoice.id, { ngayPhatHanh: event.target.value })} InputLabelProps={{ shrink: true }} />
                                </Box>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmExportOpen(false)} disabled={confirmingExported}>Đóng</Button>
                    <Button color="success" variant="contained" onClick={confirmGroupExported} disabled={confirmingExported || !selectedConfirmableInvoices.length}>
                        {confirmingExported ? "Đang xác nhận..." : "Xác nhận đã xuất"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
