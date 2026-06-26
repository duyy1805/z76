import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import BuyerSelector from "../components/hoa-don/BuyerSelector";
import HoaDonItemGrid from "../components/hoa-don/HoaDonItemGrid";
import HoaDonTotals from "../components/hoa-don/HoaDonTotals";
import SectionCard from "../components/hoa-don/SectionCard";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    DEFAULT_INVOICE_FORM,
    INVOICE_TYPE_LABELS,
    TAX_MODE_LABELS,
    invoiceToForm,
    normalizeInvoicePayload,
} from "../utils/hoa-don";

function cloneDefaultForm() {
    return {
        ...DEFAULT_INVOICE_FORM,
        chiTiet: DEFAULT_INVOICE_FORM.chiTiet.map((line) => ({ ...line })),
        quocPhong: { ...DEFAULT_INVOICE_FORM.quocPhong, chiTiet: [] },
    };
}

export default function HoaDonFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();
    const [form, setForm] = useState(cloneDefaultForm);
    const [loading, setLoading] = useState(Boolean(id));
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    useEffect(() => {
        if (!id || !user?.id || !user?.idDonVi) return;
        setLoading(true);
        hoaDonApi.getHoaDon(id, { userId: user.id, idDonVi: user.idDonVi })
            .then((detail) => setForm(invoiceToForm(detail)))
            .catch((error) => setToast({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được hồ sơ hóa đơn." }))
            .finally(() => setLoading(false));
    }, [id, user?.id, user?.idDonVi]);

    const kyHieuSuggestion = useMemo(() => {
        if (form.maLoaiHoaDon === "XuatKhau") return "1C26TXK";
        if (form.cheDoThue === "NhieuThueSuat") return "1C26TAC";
        return "1C26TAB";
    }, [form.maLoaiHoaDon, form.cheDoThue]);

    useEffect(() => {
        if (!isEdit) setForm((current) => ({ ...current, kyHieuDuKien: kyHieuSuggestion }));
    }, [kyHieuSuggestion, isEdit]);

    const setField = (patch) => setForm((current) => ({ ...current, ...patch }));
    const setQuocPhong = (patch) => setForm((current) => ({ ...current, quocPhong: { ...current.quocPhong, ...patch } }));

    const validate = () => {
        if (!form.tenNguoiMuaSnapshot?.trim()) return "Chọn hoặc nhập tên người mua.";
        if (!form.diaChiSnapshot?.trim()) return "Nhập địa chỉ người mua.";
        if (!form.ngayHoaDon) return "Nhập ngày hóa đơn.";
        if (!form.chiTiet?.length || form.chiTiet.some((line) => !line.tenHangHoaDichVu?.trim())) return "Mỗi dòng hàng phải có tên hàng hóa/dịch vụ.";
        if (form.maLoaiHoaDon === "QuocPhong" && (!form.quocPhong?.quyetDinhGiaoNhiemVu || !form.quocPhong?.soHopDong)) {
            return "Hóa đơn quốc phòng cần quyết định giao nhiệm vụ và số hợp đồng.";
        }
        return "";
    };

    const save = async ({ submit = false } = {}) => {
        const error = validate();
        if (error) {
            setToast({ open: true, type: "warning", msg: error });
            return;
        }
        setSaving(true);
        try {
            const payload = normalizeInvoicePayload(form, user);
            const result = isEdit
                ? await hoaDonApi.updateHoaDon(id, payload)
                : await hoaDonApi.createHoaDon(payload);
            const hoaDonId = result?.hoaDon?.id || result?.hoaDon?.hoaDonId || id;
            if (submit && hoaDonId) {
                await hoaDonApi.submitHoaDon(hoaDonId, user);
                navigate(`/hoa-don-dien-tu/${hoaDonId}`);
                return;
            }
            setToast({ open: true, type: "success", msg: "Đã lưu nháp hóa đơn." });
            if (!isEdit && hoaDonId) navigate(`/hoa-don-dien-tu/${hoaDonId}/edit`, { replace: true });
        } catch (exception) {
            setToast({ open: true, type: "error", msg: exception?.response?.data?.message || "Lưu hóa đơn thất bại." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Typography sx={{ p: 3 }}>Đang tải hồ sơ...</Typography>;
    }

    return (
        <Box sx={{ height: "100%", overflow: { md: "auto" }, pr: { md: 0.5 } }}>
            <Stack spacing={2.25}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
                    <Box>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1 }}>Quay lại</Button>
                        <Typography variant="h5">{isEdit ? "Sửa nháp hóa đơn" : "Đăng ký hóa đơn điện tử"}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Nhập đầy đủ dữ liệu bắt buộc để có thể xuất file import hóa đơn.</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button startIcon={<SaveIcon />} variant="outlined" disabled={saving} onClick={() => save()}>Lưu nháp</Button>
                        <Button startIcon={<SendIcon />} variant="contained" disabled={saving} onClick={() => save({ submit: true })}>Lưu & trình</Button>
                    </Stack>
                </Stack>

                <SectionCard title="Thông tin hóa đơn" subtitle="Chọn loại nghiệp vụ, chế độ thuế và thông tin hiển thị trên phần mềm xuất hóa đơn.">
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr" }, gap: 1.5 }}>
                        <TextField select label="Loại hóa đơn" value={form.maLoaiHoaDon} onChange={(e) => setField({ maLoaiHoaDon: e.target.value, cheDoThue: e.target.value === "TrongNuoc" ? form.cheDoThue : "MotThueSuat" })}>
                            {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        <TextField select label="Chế độ thuế" value={form.cheDoThue} onChange={(e) => setField({ cheDoThue: e.target.value })} disabled={form.maLoaiHoaDon !== "TrongNuoc"}>
                            {Object.entries(TAX_MODE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        <TextField type="date" label="Ngày hóa đơn" value={form.ngayHoaDon || ""} onChange={(e) => setField({ ngayHoaDon: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField select label="Hình thức thanh toán" value={form.hinhThucThanhToan || "Chuyển khoản"} onChange={(e) => setField({ hinhThucThanhToan: e.target.value })}>
                            <MenuItem value="Chuyển khoản">Chuyển khoản</MenuItem>
                            <MenuItem value="Tiền mặt">Tiền mặt</MenuItem>
                        </TextField>
                        <TextField label="Ký hiệu dự kiến" value={form.kyHieuDuKien || ""} onChange={(e) => setField({ kyHieuDuKien: e.target.value })} placeholder={kyHieuSuggestion} />
                        <TextField label="Mẫu hóa đơn dự kiến" value={form.mauHoaDonDuKien || ""} onChange={(e) => setField({ mauHoaDonDuKien: e.target.value })} />
                        <TextField label="Loại tiền" value={form.maLoaiTien || "VND"} onChange={(e) => setField({ maLoaiTien: e.target.value.toUpperCase(), tyGia: e.target.value.toUpperCase() === "VND" ? 1 : form.tyGia })} />
                        <TextField type="number" label="Tỷ giá" value={form.tyGia || 1} onChange={(e) => setField({ tyGia: e.target.value })} disabled={form.maLoaiTien === "VND"} inputProps={{ min: 0, step: "0.000001" }} />
                        <FormControlLabel control={<Checkbox checked={!!form.coBangKe} onChange={(e) => setField({ coBangKe: e.target.checked })} />} label="Lập kèm bảng kê" />
                    </Box>
                </SectionCard>

                <SectionCard title="Người mua" subtitle="Chọn từ danh mục dùng lại hoặc tạo nhanh ngay trong form. Snapshot được lưu vào hóa đơn.">
                    <BuyerSelector form={form} setForm={setForm} user={user} setToast={setToast} />
                </SectionCard>

                {form.maLoaiHoaDon === "QuocPhong" && (
                    <SectionCard title="Thông tin kiểm soát hàng quốc phòng">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
                            <TextField label="Nhà máy" value={form.quocPhong.nhaMay} onChange={(e) => setQuocPhong({ nhaMay: e.target.value })} />
                            <TextField label="Bộ phận" value={form.quocPhong.tenBoPhan} onChange={(e) => setQuocPhong({ tenBoPhan: e.target.value })} />
                            <TextField label="Quyết định giao nhiệm vụ *" value={form.quocPhong.quyetDinhGiaoNhiemVu} onChange={(e) => setQuocPhong({ quyetDinhGiaoNhiemVu: e.target.value })} />
                            <TextField label="Số hợp đồng *" value={form.quocPhong.soHopDong} onChange={(e) => setQuocPhong({ soHopDong: e.target.value })} />
                            <TextField label="Số phiếu xuất" value={form.quocPhong.soPhieuXuat} onChange={(e) => setQuocPhong({ soPhieuXuat: e.target.value })} />
                            <TextField label="Phê duyệt giá" value={form.quocPhong.pheDuyetGia} onChange={(e) => setQuocPhong({ pheDuyetGia: e.target.value })} />
                        </Box>
                    </SectionCard>
                )}

                <SectionCard
                    title="Hàng hóa / Dịch vụ"
                    subtitle="Tên hàng nhập trực tiếp theo từng hóa đơn, không chuẩn hóa theo danh mục."
                    action={form.cheDoThue === "MotThueSuat" && (
                        <TextField size="small" type="number" label="Thuế GTGT (%)" value={form.thueSuatChung} onChange={(e) => setField({ thueSuatChung: e.target.value })} sx={{ width: 150 }} />
                    )}
                >
                    <Stack spacing={2}>
                        <HoaDonItemGrid
                            lines={form.chiTiet}
                            setLines={(updater) => setForm((current) => ({ ...current, chiTiet: typeof updater === "function" ? updater(current.chiTiet) : updater }))}
                            maLoaiHoaDon={form.maLoaiHoaDon}
                            cheDoThue={form.cheDoThue}
                            thueSuatChung={form.thueSuatChung}
                            tyGia={form.tyGia}
                        />
                        <HoaDonTotals lines={form.chiTiet.map((line) => ({ ...line, thueSuatGTGT: form.cheDoThue === "MotThueSuat" ? form.thueSuatChung : line.thueSuatGTGT }))} tyGia={form.tyGia} currency={form.maLoaiTien} />
                    </Stack>
                </SectionCard>

                <SectionCard title="Ghi chú nội bộ">
                    <TextField fullWidth multiline minRows={3} label="Ghi chú" value={form.ghiChu || ""} onChange={(e) => setField({ ghiChu: e.target.value })} />
                </SectionCard>
            </Stack>

            <Snackbar open={toast.open} autoHideDuration={3600} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.type} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
