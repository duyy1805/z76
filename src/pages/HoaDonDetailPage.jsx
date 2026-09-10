import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import { NumericFormat } from "react-number-format";
import StatusChip from "../components/StatusChip";
import HoaDonWorkflowActions from "../components/hoa-don/HoaDonWorkflowActions";
import SectionCard from "../components/hoa-don/SectionCard";
import { api, hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    canApproveInvoice,
    canEditInvoice,
    canProcessInvoiceExportInfo,
    currencyAmountScale,
    currencyUnitPriceScale,
    fmtMoney,
    formatInvoiceDate,
    formatInvoiceDateTime,
    invoiceOrderContractInfo,
    INVOICE_NUMBER_FORMAT,
    INVOICE_TYPE_LABELS,
    REVENUE_TYPE_LABELS,
    isInvoiceExportInfoComplete,
    TAX_MODE_LABELS,
    vatRateLabel,
    vatRateValue,
    VAT_RATE_OPTIONS,
} from "../utils/hoa-don";
import { amountToVietnameseText } from "../utils/phieu-sec";
import {
    currentInvoicePath,
    invoiceReturnLabel,
    safeInvoiceReturnTo,
    withInvoiceReturnTo,
} from "../utils/hoa-don-navigation";

const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";
const ATTACHMENT_MAX_FILES = 10;
const ATTACHMENT_MAX_SIZE = 30 * 1024 * 1024;
const ATTACHMENT_ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"]);

const DetailField = ({ label, value }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 650, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{value || "—"}</Typography>
    </Box>
);

function NumericTextField({ value, onChange, inputProps, ...props }) {
    return (
        <NumericFormat
            {...props}
            customInput={TextField}
            thousandSeparator=","
            decimalSeparator="."
            allowNegative={false}
            value={value ?? ""}
            onValueChange={(values) => onChange(values.value)}
            inputProps={{ ...inputProps, inputMode: "decimal" }}
        />
    );
}

function formatQuantity(value, fraction = 2) {
    const n = Number(value || 0);
    return n.toLocaleString("en-US", {
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
    });
}

function formatFileSize(value) {
    const bytes = Number(value || 0);
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildCurrencyOptions(currencies = [], selectedCurrency = "VND") {
    const byCode = new Map();
    byCode.set("VND", { MaLoaiTien: "VND", TenLoaiTien: "Việt Nam đồng" });
    currencies.forEach((item) => {
        const code = String(item?.MaLoaiTien || "").trim();
        if (code) byCode.set(code, item);
    });
    const selectedCode = String(selectedCurrency || "").trim();
    if (selectedCode && !byCode.has(selectedCode)) {
        byCode.set(selectedCode, { MaLoaiTien: selectedCode, TenLoaiTien: selectedCode });
    }
    return Array.from(byCode.values());
}

function initExportInfo(detail) {
    const lines = detail?.chiTiet || [];
    const hasExportInfo = Boolean(detail?.hinhThucThanhToan);
    return {
        hinhThucThanhToan: detail?.hinhThucThanhToan || "Chuyển khoản",
        cheDoThue: detail?.cheDoThue || "MotThueSuat",
        maLoaiTien: detail?.maLoaiTien || "VND",
        tyGia: detail?.tyGia || 1,
        thueSuatChung: hasExportInfo ? String(lines[0]?.MaThueSuatGTGT || lines[0]?.ThueSuatGTGT || "0") : "",
        chiTiet: lines.map((line) => ({
            soDong: line.SoDong,
            thueSuatGTGT: hasExportInfo ? String(line.MaThueSuatGTGT || line.ThueSuatGTGT || "0") : "",
        })),
    };
}

export default function HoaDonDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { user } = auth;
    const [detail, setDetail] = useState(null);
    const [exportInfo, setExportInfo] = useState(null);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingExportInfo, setSavingExportInfo] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const [reasonDialog, setReasonDialog] = useState({ open: false, type: "", title: "", label: "", reason: "" });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deletingInvoice, setDeletingInvoice] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
    const defaultReturnTo = detail?.nhomImportId
        ? withInvoiceReturnTo(`/hoa-don-dien-tu/nhom-import/${detail.nhomImportId}`, "/hoa-don-dien-tu?tab=groups")
        : "/hoa-don-dien-tu";
    const returnTo = safeInvoiceReturnTo(new URLSearchParams(location.search).get("returnTo"), defaultReturnTo);
    const detailReturnTo = currentInvoicePath(location);

    const load = useCallback(async () => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        try {
            const data = await hoaDonApi.getHoaDon(id, { userId: user.id, idDonVi: user.idDonVi });
            setDetail(data);
            setExportInfo(initExportInfo(data));
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được chi tiết hóa đơn." });
        } finally {
            setLoading(false);
        }
    }, [id, user?.id, user?.idDonVi]);

    useEffect(() => {
        api.listLoaiTien({ tontai: 1 })
            .then((rows) => setCurrencies(rows || []))
            .catch(() => setCurrencies([]));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const runAction = async (label, fn) => {
        try {
            await fn();
            setToast({ open: true, type: "success", msg: `${label} thành công.` });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || `${label} thất bại.` });
        }
    };

    const openReasonDialog = (type) => {
        setReasonDialog({
            open: true,
            type,
            title: type === "return" ? "Trả lại hóa đơn" : "Từ chối hóa đơn",
            label: type === "return" ? "Lý do trả lại" : "Lý do từ chối",
            reason: "",
        });
    };

    const closeReasonDialog = () => {
        setReasonDialog({ open: false, type: "", title: "", label: "", reason: "" });
    };

    const submitReasonDialog = async () => {
        const ghiChu = reasonDialog.reason.trim();
        if (!ghiChu) {
            setToast({ open: true, type: "warning", msg: "Vui lòng nhập lý do." });
            return;
        }
        const isReturn = reasonDialog.type === "return";
        closeReasonDialog();
        await runAction(
            isReturn ? "Trả lại" : "Từ chối",
            () => hoaDonApi.approveHoaDon(detail.id, {
                hanhDong: isReturn ? "TraLai" : "TuChoi",
                user,
                ghiChu,
            })
        );
    };

    const confirmDelete = async () => {
        setDeletingInvoice(true);
        try {
            await hoaDonApi.deleteHoaDon(detail.id, user);
            navigate(returnTo, {
                replace: true,
                state: { toast: { type: "success", msg: "Xóa hóa đơn thành công." } },
            });
        } catch (error) {
            setConfirmDeleteOpen(false);
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa hóa đơn thất bại." });
        } finally {
            setDeletingInvoice(false);
        }
    };

    const canEditExportInfo = canProcessInvoiceExportInfo(detail, auth);
    const canManageAttachments = canEditInvoice(detail, auth);
    const exportInfoComplete = isInvoiceExportInfoComplete(detail);
    const approveDisabledReason = detail?.maTrangThai === "ChoXuLy_HoaDon" && canApproveInvoice(detail, auth) && !exportInfoComplete
        ? "Cần lưu đủ hình thức thanh toán, chế độ thuế, thuế suất, loại tiền và tỷ giá trước khi duyệt."
        : "";
    const showTaxPerLine = exportInfo?.cheDoThue === "NhieuThueSuat";
    const currencyOptions = useMemo(() => buildCurrencyOptions(currencies, exportInfo?.maLoaiTien), [currencies, exportInfo?.maLoaiTien]);
    const totalPaymentText = amountToVietnameseText(detail?.tongTienThanhToan, detail?.maLoaiTien || "VND");

    const setExportField = (patch) => setExportInfo((current) => ({ ...current, ...patch }));
    const setExportLineTax = (soDong, value) => {
        setExportInfo((current) => ({
            ...current,
            chiTiet: (current?.chiTiet || []).map((line) => Number(line.soDong) === Number(soDong) ? { ...line, thueSuatGTGT: value } : line),
        }));
    };

    const saveExportInfo = async () => {
        if (!exportInfo?.hinhThucThanhToan) {
            setToast({ open: true, type: "warning", msg: "Chọn hình thức thanh toán." });
            return;
        }
        if (!exportInfo?.maLoaiTien || Number(exportInfo?.tyGia || 0) <= 0) {
            setToast({ open: true, type: "warning", msg: "Nhập loại tiền và tỷ giá hợp lệ." });
            return;
        }
        const chiTiet = (detail.chiTiet || []).map((line) => {
            const code = String(showTaxPerLine
                ? (exportInfo.chiTiet || []).find((item) => Number(item.soDong) === Number(line.SoDong))?.thueSuatGTGT ?? ""
                : exportInfo.thueSuatChung ?? "");
            return { soDong: line.SoDong, maThueSuatGTGT: code, thueSuatGTGT: vatRateValue(code) };
        });
        if (chiTiet.some((line) => !VAT_RATE_OPTIONS.some((option) => option.value === line.maThueSuatGTGT))) {
            setToast({ open: true, type: "warning", msg: "Chọn thuế GTGT cho đầy đủ các dòng hàng." });
            return;
        }

        setSavingExportInfo(true);
        try {
            await hoaDonApi.updateThongTinXuatHoaDon(detail.id, {
                ...exportInfo,
                thueSuatChung: vatRateValue(exportInfo.thueSuatChung),
                tyGia: exportInfo.maLoaiTien === "VND" ? 1 : Number(exportInfo.tyGia || 1),
                chiTiet,
                requesterUserId: user?.id,
                requesterIdDonVi: user?.idDonVi,
            });
            setToast({ open: true, type: "success", msg: "Đã lưu thông tin xuất hóa đơn." });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Lưu thông tin xuất hóa đơn thất bại." });
        } finally {
            setSavingExportInfo(false);
        }
    };

    const uploadAttachments = async () => {
        if (!attachmentFiles.length) return;
        setUploadingAttachments(true);
        try {
            await hoaDonApi.uploadTaiLieuHoaDon(detail.id, attachmentFiles, user);
            setAttachmentFiles([]);
            setToast({ open: true, type: "success", msg: "Đã đính kèm tài liệu." });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Đính kèm tài liệu thất bại." });
        } finally {
            setUploadingAttachments(false);
        }
    };

    const selectAttachmentFiles = (fileList) => {
        const files = Array.from(fileList || []);
        if (files.length > ATTACHMENT_MAX_FILES) {
            setAttachmentFiles([]);
            setToast({ open: true, type: "warning", msg: `Chỉ được chọn tối đa ${ATTACHMENT_MAX_FILES} file trong mỗi lần.` });
            return;
        }
        const unsupported = files.find((file) => !ATTACHMENT_ALLOWED_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase()));
        if (unsupported) {
            setAttachmentFiles([]);
            setToast({ open: true, type: "warning", msg: `File “${unsupported.name}” không thuộc định dạng được hỗ trợ.` });
            return;
        }
        const oversized = files.find((file) => file.size > ATTACHMENT_MAX_SIZE);
        if (oversized) {
            setAttachmentFiles([]);
            setToast({ open: true, type: "warning", msg: `File “${oversized.name}” vượt quá giới hạn 30 MB.` });
            return;
        }
        setAttachmentFiles(files);
    };

    const deleteAttachment = async (attachment) => {
        const taiLieuId = attachment.TaiLieuId ?? attachment.taiLieuId;
        if (!taiLieuId || !window.confirm(`Xóa tài liệu “${attachment.FileName || attachment.fileName || "đã chọn"}”? File sẽ bị xóa thật khỏi Google Drive hoặc vùng lưu trữ local cũ.`)) return;
        setDeletingAttachmentId(taiLieuId);
        try {
            await hoaDonApi.deleteTaiLieuHoaDon(taiLieuId, user);
            setToast({ open: true, type: "success", msg: "Đã xóa tài liệu đính kèm." });
            await load();
        } catch (error) {
            setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Xóa tài liệu thất bại." });
        } finally {
            setDeletingAttachmentId(null);
        }
    };

    if (loading) return <Typography sx={{ p: 3 }}>Đang tải chi tiết...</Typography>;
    if (!detail) return <Alert severity="warning">Không tìm thấy hóa đơn.</Alert>;

    return (
        <Box sx={{ pr: { md: 0.5 } }}>
            <Stack spacing={2.25}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} spacing={1.5}>
                    <Box>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(returnTo)} sx={{ mb: 1 }}>{invoiceReturnLabel(returnTo)}</Button>
                        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="h5">{detail.maDangKy}</Typography>
                            <StatusChip status={detail.maTrangThai} />
                            {detail.maNhomImport && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => navigate(
                                        invoiceReturnLabel(returnTo) === "Quay lại nhóm"
                                            ? returnTo
                                            : withInvoiceReturnTo(`/hoa-don-dien-tu/nhom-import/${detail.nhomImportId}`, returnTo)
                                    )}
                                >
                                    Nhóm {detail.maNhomImport}
                                </Button>
                            )}
                        </Stack>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {INVOICE_TYPE_LABELS[detail.maLoaiHoaDon] || detail.maLoaiHoaDon || "Chưa phân loại"} · {detail.tenNguoiMua || "Chưa có người mua"}
                        </Typography>
                    </Box>
                    <HoaDonWorkflowActions
                        invoice={detail}
                        auth={auth}
                        onEdit={() => navigate(withInvoiceReturnTo(`/hoa-don-dien-tu/${detail.id}/edit`, detailReturnTo))}
                        onSubmit={() => runAction("Trình duyệt", () => hoaDonApi.submitHoaDon(detail.id, user))}
                        onApprove={() => runAction("Duyệt", () => hoaDonApi.approveHoaDon(detail.id, { hanhDong: "Duyet", user }))}
                        onReturn={() => openReasonDialog("return")}
                        onReject={() => openReasonDialog("reject")}
                        onDelete={() => setConfirmDeleteOpen(true)}
                        approveDisabledReason={approveDisabledReason}
                    />
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.2fr .8fr" }, gap: 2 }}>
                    <SectionCard title="Thông tin người mua">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
                            <DetailField label={detail.loaiNguoiMua === "CaNhan" ? "Họ tên người mua" : "Tên đơn vị mua hàng"} value={detail.tenNguoiMua} />
                            <DetailField
                                label={detail.loaiNguoiMua === "CaNhan" ? "Căn cước công dân" : detail.maSoThue ? "Mã số thuế" : "MĐVCQHNS"}
                                value={detail.loaiNguoiMua === "CaNhan" ? detail.soGiayTo : detail.maSoThue || detail.maDvcqhns}
                            />
                            {detail.loaiNguoiMua !== "CaNhan" && <DetailField label="Mã đơn vị" value={detail.maDonVi} />}
                            <DetailField label="Địa chỉ" value={detail.diaChi} />
                            {detail.loaiNguoiMua !== "CaNhan" && <DetailField label="Người mua hàng" value={detail.nguoiLienHe} />}
                            <DetailField label="Email" value={detail.email} />
                            <DetailField label="Điện thoại" value={detail.dienThoai} />
                        </Box>
                    </SectionCard>

                    <SectionCard title="Thông tin hóa đơn">
                        <Stack spacing={1.5}>
                            <DetailField label="Ngày hóa đơn" value={formatInvoiceDate(detail.ngayHoaDon)} />
                            <DetailField label="Thời hạn thanh toán" value={formatInvoiceDate(detail.hanThanhToan)} />
                            <DetailField label="Loại hình doanh thu" value={REVENUE_TYPE_LABELS[detail.loaiHinhDoanhThu] || detail.loaiHinhDoanhThu} />
                            {detail.maLoaiHoaDon !== "QuocPhong" && invoiceOrderContractInfo(detail) && <DetailField label="Đơn hàng/hợp đồng" value={invoiceOrderContractInfo(detail)} />}
                            <DetailField label="Ký hiệu dự kiến" value={detail.kyHieuDuKien} />
                            {detail.soHoaDon && <DetailField label="Số hóa đơn đã phát hành" value={`${detail.kyHieuHoaDon} - ${detail.soHoaDon}`} />}
                        </Stack>
                    </SectionCard>
                </Box>

                <SectionCard
                    title="Thông tin xuất hóa đơn"
                    subtitle={exportInfoComplete ? "Thông tin thuế, thanh toán và quy đổi đã được lưu để xuất file import." : "Người phụ trách hóa đơn cần chốt thông tin này trước khi duyệt sẵn sàng xuất."}
                    action={canEditExportInfo && (
                        <Button startIcon={<SaveIcon />} variant="contained" onClick={saveExportInfo} disabled={savingExportInfo}>
                            Lưu thông tin xuất
                        </Button>
                    )}
                >
                    {canEditExportInfo ? (
                        <Stack spacing={2}>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" }, gap: 1.5 }}>
                                <TextField select label="Hình thức thanh toán" value={exportInfo?.hinhThucThanhToan || ""} onChange={(event) => setExportField({ hinhThucThanhToan: event.target.value })}>
                                    <MenuItem value="Chuyển khoản">Chuyển khoản</MenuItem>
                                    <MenuItem value="Tiền mặt">Tiền mặt</MenuItem>
                                </TextField>
                                <TextField select label="Chế độ thuế" value={exportInfo?.cheDoThue || "MotThueSuat"} onChange={(event) => setExportField({ cheDoThue: event.target.value })}>
                                    {Object.entries(TAX_MODE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                                </TextField>
                                {!showTaxPerLine && (
                                    <TextField select required label="Thuế GTGT" value={exportInfo?.thueSuatChung ?? ""} onChange={(event) => setExportField({ thueSuatChung: event.target.value })}>
                                        {VAT_RATE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                                    </TextField>
                                )}
                                <TextField select label="Loại tiền" value={exportInfo?.maLoaiTien || "VND"} onChange={(event) => {
                                    const maLoaiTien = event.target.value;
                                    setExportField({ maLoaiTien, tyGia: maLoaiTien === "VND" ? 1 : exportInfo?.tyGia || 1 });
                                }}>
                                    {currencyOptions.map((item) => (
                                        <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>
                                            {item.MaLoaiTien} - {item.TenLoaiTien}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <NumericTextField decimalScale={INVOICE_NUMBER_FORMAT.exchangeRate} label="Tỷ giá" value={exportInfo?.tyGia || ""} disabled={exportInfo?.maLoaiTien === "VND"} onChange={(value) => setExportField({ tyGia: value })} />
                            </Box>

                            {showTaxPerLine && (
                                <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Dòng</TableCell>
                                                <TableCell>Tên hàng hóa/dịch vụ (*)</TableCell>
                                                <TableCell align="right">Thuế GTGT (%)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(detail.chiTiet || []).map((line) => {
                                                const taxLine = (exportInfo?.chiTiet || []).find((item) => Number(item.soDong) === Number(line.SoDong));
                                                return (
                                                    <TableRow key={line.ChiTietId}>
                                                        <TableCell>{line.SoDong}</TableCell>
                                                        <TableCell>{line.TenHangHoaDichVu}</TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                select
                                                                size="small"
                                                                value={taxLine?.thueSuatGTGT ?? ""}
                                                                onChange={(event) => setExportLineTax(line.SoDong, event.target.value)}
                                                                inputProps={{ style: { textAlign: "right" } }}
                                                                sx={{ width: 140 }}
                                                            >
                                                                {VAT_RATE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                                                            </TextField>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
                            <DetailField label="Hình thức thanh toán" value={detail.hinhThucThanhToan} />
                            <DetailField label="Chế độ thuế" value={TAX_MODE_LABELS[detail.cheDoThue] || detail.cheDoThue} />
                            <DetailField label="Loại tiền / Tỷ giá" value={detail.maLoaiTien ? `${detail.maLoaiTien} / ${detail.tyGia || 1}` : ""} />
                            <DetailField label="Trạng thái thông tin xuất" value={exportInfoComplete ? "Đã chốt" : "Chưa chốt"} />
                        </Box>
                    )}
                </SectionCard>

                {detail.quocPhong && (
                    <SectionCard title="Thông tin quốc phòng">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                            <DetailField label="Nhà máy" value={detail.quocPhong.NhaMay} />
                            <DetailField label="Bộ phận" value={detail.quocPhong.TenBoPhan} />
                            <DetailField label="Quyết định giao nhiệm vụ" value={detail.quocPhong.QuyetDinhGiaoNhiemVu} />
                            {detail.loaiHinhDoanhThu === "QuocPhongNhomI" && <DetailField label="Nguồn ngân sách" value={detail.quocPhong.NguonNganSach} />}
                            <DetailField label="Hợp đồng" value={detail.quocPhong.SoHopDong} />
                            <DetailField label="Phiếu xuất" value={detail.quocPhong.SoPhieuXuat} />
                            <DetailField label="Phê duyệt giá" value={detail.quocPhong.PheDuyetGia} />
                        </Box>
                    </SectionCard>
                )}

                <SectionCard title="Hàng hóa / Dịch vụ">
                    <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Dòng</TableCell>
                                    <TableCell>Mã hàng</TableCell>
                                    <TableCell>Tên hàng hóa/dịch vụ (*)</TableCell>
                                    <TableCell>ĐVT</TableCell>
                                    <TableCell align="right">Số lượng</TableCell>
                                    <TableCell align="right">Đơn giá</TableCell>
                                    <TableCell align="right">Thuế suất GTGT (%)</TableCell>
                                    <TableCell align="right">Thành tiền</TableCell>
                                    {detail.cheDoThue === "NhieuThueSuat" && <TableCell align="right">Tiền thuế GTGT</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(detail.chiTiet || []).map((line) => (
                                    <TableRow key={line.ChiTietId}>
                                        <TableCell>{line.SoDong}</TableCell>
                                        <TableCell>{line.MaHang || "—"}</TableCell>
                                        <TableCell>{line.TenHangHoaDichVu}</TableCell>
                                        <TableCell>{line.DonViTinh || "—"}</TableCell>
                                        <TableCell align="right">{formatQuantity(line.SoLuong, INVOICE_NUMBER_FORMAT.quantity)}</TableCell>
                                        <TableCell align="right">{fmtMoney(line.DonGia, currencyUnitPriceScale(detail.maLoaiTien), detail.maLoaiTien)}</TableCell>
                                        <TableCell align="right">{vatRateLabel(line.MaThueSuatGTGT, line.ThueSuatGTGT)}</TableCell>
                                        <TableCell align="right">{fmtMoney(line.ThanhTien, currencyAmountScale(detail.maLoaiTien), detail.maLoaiTien)}</TableCell>
                                        {detail.cheDoThue === "NhieuThueSuat" && (
                                            <TableCell align="right">{fmtMoney(line.TienThueGTGT, currencyAmountScale(detail.maLoaiTien), detail.maLoaiTien)}</TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack alignItems="flex-end" spacing={1} sx={{ mt: 2 }}>
                        <Typography>Tổng tiền hàng: <b>{fmtMoney(detail.tongTienHang, currencyAmountScale(detail.maLoaiTien), detail.maLoaiTien)} {detail.maLoaiTien}</b></Typography>
                        <Typography>Tiền thuế GTGT: <b>{fmtMoney(detail.tongTienThue, currencyAmountScale(detail.maLoaiTien), detail.maLoaiTien)} {detail.maLoaiTien}</b></Typography>
                        <Typography variant="h6">Tổng thanh toán: {fmtMoney(detail.tongTienThanhToan, currencyAmountScale(detail.maLoaiTien), detail.maLoaiTien)} {detail.maLoaiTien}</Typography>
                        {totalPaymentText && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right", maxWidth: 520 }}>
                                Bằng chữ: {totalPaymentText}
                            </Typography>
                        )}
                    </Stack>
                </SectionCard>

                <SectionCard
                    title="Tài liệu đính kèm"
                    subtitle={canManageAttachments
                        ? "Tối đa 10 file/lần, 30 MB/file; hỗ trợ PDF, Word, Excel và ảnh JPG/PNG."
                        : "Tài liệu thuộc hồ sơ hóa đơn."}
                    action={canManageAttachments && (
                        <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} disabled={uploadingAttachments}>
                            Chọn tài liệu
                            <input
                                hidden
                                multiple
                                type="file"
                                accept={ATTACHMENT_ACCEPT}
                                onChange={(event) => {
                                    selectAttachmentFiles(event.target.files);
                                    event.target.value = "";
                                }}
                            />
                        </Button>
                    )}
                >
                    {canManageAttachments && attachmentFiles.length > 0 && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                                Đã chọn {attachmentFiles.length} tài liệu: {attachmentFiles.map((file) => file.name).join(", ")}
                            </Typography>
                            <Button startIcon={<UploadFileIcon />} variant="contained" onClick={uploadAttachments} disabled={uploadingAttachments}>
                                {uploadingAttachments ? "Đang tải lên..." : "Tải lên"}
                            </Button>
                            <Button onClick={() => setAttachmentFiles([])} disabled={uploadingAttachments}>Bỏ chọn</Button>
                        </Stack>
                    )}

                    {(detail.taiLieu || []).length ? (
                        <TableContainer component={Paper} elevation={0} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tên tài liệu</TableCell>
                                        <TableCell sx={{ width: 120 }}>Dung lượng</TableCell>
                                        <TableCell sx={{ minWidth: 160 }}>Ngày đính kèm</TableCell>
                                        <TableCell align="right" sx={{ width: 120 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(detail.taiLieu || []).map((attachment) => {
                                        const taiLieuId = attachment.TaiLieuId ?? attachment.taiLieuId;
                                        return (
                                            <TableRow key={taiLieuId} hover>
                                                <TableCell>{attachment.FileName || attachment.fileName || "Tài liệu"}</TableCell>
                                                <TableCell>{formatFileSize(attachment.FileSize ?? attachment.fileSize)}</TableCell>
                                                <TableCell>{formatInvoiceDateTime(attachment.NgayTao || attachment.ngayTao)}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        title="Mở tài liệu"
                                                        onClick={() => window.open(hoaDonApi.getTaiLieuHoaDonUrl(taiLieuId, user), "_blank", "noopener,noreferrer")}
                                                    >
                                                        <OpenInNewIcon fontSize="small" />
                                                    </IconButton>
                                                    {canManageAttachments && (
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            title="Xóa tài liệu"
                                                            disabled={deletingAttachmentId === taiLieuId}
                                                            onClick={() => deleteAttachment(attachment)}
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography color="text.secondary">Chưa có tài liệu đính kèm.</Typography>
                    )}
                </SectionCard>

                <SectionCard title="Lịch sử xử lý">
                    <Stack divider={<Divider flexItem />} spacing={1}>
                        {(detail.lichSuDuyet || []).map((item) => (
                            <Box key={item.PheDuyetId}>
                                <Typography sx={{ fontWeight: 750 }}>{item.HanhDong} · {item.TenNguoiThucHien || item.NguoiThucHienId}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.TuTrangThai} → {item.DenTrangThai} · {item.ThoiDiem}</Typography>
                                {item.GhiChu && <Typography sx={{ mt: 0.5 }}>{item.GhiChu}</Typography>}
                            </Box>
                        ))}
                        {!detail.lichSuDuyet?.length && <Typography color="text.secondary">Chưa có lịch sử duyệt.</Typography>}
                    </Stack>
                </SectionCard>
            </Stack>

            <Snackbar open={toast.open} autoHideDuration={3600} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>

            <Dialog open={reasonDialog.open} onClose={closeReasonDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{reasonDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                        Lý do sẽ được lưu vào lịch sử xử lý để người lập hóa đơn biết cần điều chỉnh gì.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={4}
                        label={reasonDialog.label}
                        value={reasonDialog.reason}
                        onChange={(event) => setReasonDialog((current) => ({ ...current, reason: event.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReasonDialog}>Đóng</Button>
                    <Button
                        variant="contained"
                        color={reasonDialog.type === "return" ? "warning" : "error"}
                        onClick={submitReasonDialog}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onClose={() => !deletingInvoice && setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xóa hồ sơ hóa đơn?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Hồ sơ sẽ được xóa mềm và không còn hiển thị trong danh sách làm việc. Toàn bộ file đính kèm sẽ bị xóa thật khỏi Google Drive hoặc vùng lưu trữ local cũ.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deletingInvoice}>Đóng</Button>
                    <Button color="error" variant="contained" onClick={confirmDelete} disabled={deletingInvoice}>
                        {deletingInvoice ? "Đang xóa..." : "Xóa hồ sơ"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
