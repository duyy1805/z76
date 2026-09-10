import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import { NumericFormat } from "react-number-format";
import BuyerSelector from "../components/hoa-don/BuyerSelector";
import HoaDonItemGrid from "../components/hoa-don/HoaDonItemGrid";
import HoaDonTotals from "../components/hoa-don/HoaDonTotals";
import SectionCard from "../components/hoa-don/SectionCard";
import { api, hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import {
    DEFAULT_INVOICE_FORM,
    INVOICE_NUMBER_FORMAT,
    INVOICE_TYPE_LABELS,
    REVENUE_TYPE_LABELS,
    TAX_MODE_LABELS,
    VAT_RATE_OPTIONS,
    vatRateValue,
    invoiceToForm,
    normalizeInvoicePayload,
} from "../utils/hoa-don";
import { invoiceReturnLabel, safeInvoiceReturnTo, withInvoiceReturnTo } from "../utils/hoa-don-navigation";

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

function cloneDefaultForm() {
    return {
        ...DEFAULT_INVOICE_FORM,
        chiTiet: DEFAULT_INVOICE_FORM.chiTiet.map((line) => ({ ...line })),
        quocPhong: { ...DEFAULT_INVOICE_FORM.quocPhong, chiTiet: [] },
    };
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

export default function HoaDonFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [form, setForm] = useState(cloneDefaultForm);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(Boolean(id));
    const [saving, setSaving] = useState(false);
    const [creationPolicy, setCreationPolicy] = useState({ isBlocked: false, cutoffTime: "16:30" });
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
    const returnTo = safeInvoiceReturnTo(
        new URLSearchParams(location.search).get("returnTo"),
        isEdit ? `/hoa-don-dien-tu/${id}` : "/hoa-don-dien-tu"
    );

    const detailTarget = (hoaDonId) => {
        const detailPath = `/hoa-don-dien-tu/${hoaDonId}`;
        const returnPathname = returnTo.split(/[?#]/, 1)[0];
        return returnPathname === detailPath ? returnTo : withInvoiceReturnTo(detailPath, returnTo);
    };

    useEffect(() => {
        api.listLoaiTien({ tontai: 1 })
            .then((rows) => setCurrencies(rows || []))
            .catch(() => setCurrencies([]));
    }, []);

    useEffect(() => {
        if (isEdit || !user?.id) return;
        hoaDonApi.getCreationCutoff(user).then(setCreationPolicy).catch(() => {});
    }, [isEdit, user]);

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

    const currencyOptions = useMemo(() => buildCurrencyOptions(currencies, form.maLoaiTien), [currencies, form.maLoaiTien]);

    const setField = (patch) => setForm((current) => ({ ...current, ...patch }));
    const setCurrency = (maLoaiTien) => {
        setForm((current) => ({
            ...current,
            maLoaiTien,
            tyGia: maLoaiTien === "VND" ? 1 : current.tyGia || 1,
        }));
    };
    const setQuocPhong = (patch) => setForm((current) => ({ ...current, quocPhong: { ...current.quocPhong, ...patch } }));

    const validate = () => {
        const isCompany = form.loaiNguoiMua !== "CaNhan";
        const withoutTaxCode = isCompany && Boolean(form.khongCoMaSoThue);
        const taxCode = String(form.maSoThueSnapshot || "").replace(/[\s.-]/g, "");
        const budgetRelationCode = String(form.maDvcqhnsSnapshot || "").trim();
        const citizenId = String(form.soGiayToSnapshot || "").replace(/\s/g, "");
        const email = String(form.emailSnapshot || "").trim();
        const phone = String(form.dienThoaiSnapshot || "").replace(/[\s().-]/g, "");
        if (isCompany && !withoutTaxCode && !taxCode) return "Nhập mã số thuế của tổ chức/doanh nghiệp.";
        if (isCompany && !withoutTaxCode && !/^\d{10}(?:\d{3})?$/.test(taxCode)) return "Mã số thuế phải gồm 10 hoặc 13 chữ số.";
        if (isCompany && withoutTaxCode && !budgetRelationCode) return "Nhập MĐVCQHNS của đơn vị.";
        if (isCompany && withoutTaxCode && taxCode) return "Đơn vị không có mã số thuế chỉ được nhập MĐVCQHNS.";
        if (isCompany && !withoutTaxCode && budgetRelationCode) return "Tổ chức/doanh nghiệp chỉ được nhập một trong hai mã: MST hoặc MĐVCQHNS.";
        if (!form.tenNguoiMuaSnapshot?.trim()) return isCompany ? "Nhập tên đơn vị mua hàng." : "Nhập họ tên người mua.";
        if (!form.diaChiSnapshot?.trim()) return "Nhập địa chỉ người mua.";
        if (!isCompany && citizenId && !/^(?:\d{9}|\d{12})$/.test(citizenId)) return "CCCD/CMND phải gồm 9 hoặc 12 chữ số.";
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email người mua không hợp lệ.";
        if (phone && !/^\+?\d{8,15}$/.test(phone)) return "Số điện thoại người mua không hợp lệ.";
        if (!form.maLoaiHoaDon) return "Chọn loại hóa đơn.";
        if (form.maLoaiHoaDon === "TrongNuoc" && !form.thongTinDonHang?.trim()) return "Nhập thông tin đơn hàng/hợp đồng cho hóa đơn trong nước.";
        if ((form.thongTinDonHang || "").trim().length > 500) return "Thông tin đơn hàng/hợp đồng không được quá 500 ký tự.";
        if (!form.ngayHoaDon) return "Nhập ngày hóa đơn.";
        if (!form.hanThanhToan) return "Nhập thời hạn thanh toán.";
        if (!form.loaiHinhDoanhThu) return "Chọn loại hình doanh thu.";
        if (!form.chiTiet?.length || form.chiTiet.some((line) => !line.tenHangHoaDichVu?.trim())) return "Mỗi dòng hàng phải có tên hàng hóa/dịch vụ.";
        if (form.cheDoThue === "NhieuThueSuat" && form.chiTiet.some((line) => !String(line.maThueSuatGTGT ?? line.thueSuatGTGT ?? ""))) {
            return "Chọn thuế GTGT cho từng dòng hàng.";
        }
        if (!form.maLoaiTien) return "Chọn loại tiền.";
        if (form.maLoaiTien !== "VND" && Number(form.tyGia || 0) <= 0) return "Nhập tỷ giá hợp lệ.";
        if (form.maLoaiHoaDon === "QuocPhong" && form.loaiHinhDoanhThu !== "QuocPhongNhomII" && !form.quocPhong?.quyetDinhGiaoNhiemVu?.trim()) {
            return "Nhập quyết định giao nhiệm vụ.";
        }
        if (form.maLoaiHoaDon === "QuocPhong" && form.loaiHinhDoanhThu === "QuocPhongNhomI" && !form.quocPhong?.nguonNganSach?.trim()) {
            return "Nhập nguồn ngân sách.";
        }
        if (form.maLoaiHoaDon === "QuocPhong" && !form.quocPhong?.soHopDong?.trim()) {
            return "Nhập số hợp đồng.";
        }
        if (form.maLoaiHoaDon === "QuocPhong" && !form.quocPhong?.soPhieuXuat?.trim()) {
            return "Nhập số phiếu xuất.";
        }
        if (form.maLoaiHoaDon === "QuocPhong" && !form.quocPhong?.pheDuyetGia?.trim()) {
            return "Nhập thông tin phê duyệt giá.";
        }
        return "";
    };

    const save = async ({ submit = false } = {}) => {
        if (!isEdit && creationPolicy.isBlocked) {
            setToast({ open: true, type: "warning", msg: `Đã quá ${creationPolicy.cutoffTime}. Hệ thống đang khóa tạo hóa đơn mới.` });
            return;
        }
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
                navigate(detailTarget(hoaDonId));
                return;
            }
            setToast({ open: true, type: "success", msg: "Đã lưu nháp hóa đơn." });
            if (!isEdit && hoaDonId) navigate(withInvoiceReturnTo(`/hoa-don-dien-tu/${hoaDonId}/edit`, returnTo), { replace: true });
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
        <Box sx={{ pr: { md: 0.5 } }}>
            <Stack spacing={2.25}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
                    <Box>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(returnTo)} sx={{ mb: 1 }}>{invoiceReturnLabel(returnTo)}</Button>
                        <Typography variant="h5">{isEdit ? "Sửa nháp hóa đơn" : "Đăng ký hóa đơn điện tử"}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Nhập đầy đủ dữ liệu bắt buộc để có thể xuất file import hóa đơn.</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button startIcon={<SaveIcon />} variant="outlined" disabled={saving || (!isEdit && creationPolicy.isBlocked)} onClick={() => save()}>Lưu nháp</Button>
                        <Button startIcon={<SendIcon />} variant="contained" disabled={saving || (!isEdit && creationPolicy.isBlocked)} onClick={() => save({ submit: true })}>Lưu & trình</Button>
                    </Stack>
                </Stack>

                {!isEdit && creationPolicy.isBlocked && (
                    <Alert severity="warning">Đã quá {creationPolicy.cutoffTime}. Admin đang bật chế độ khóa tạo hóa đơn mới.</Alert>
                )}

                <SectionCard title="Thông tin hóa đơn" subtitle="Nhân viên đăng ký loại nghiệp vụ, ngày hóa đơn dự kiến, thông tin thuế và thông tin nhận diện hồ sơ. Người phụ trách hóa đơn có thể kiểm tra, điều chỉnh trước khi xuất.">
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                        <TextField select required label="Loại hóa đơn" value={form.maLoaiHoaDon || ""} onChange={(e) => setField({ maLoaiHoaDon: e.target.value })}>
                            <MenuItem value="" disabled>Chọn loại hóa đơn</MenuItem>
                            {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        <TextField type="date" label="Ngày hóa đơn" value={form.ngayHoaDon || ""} onChange={(e) => setField({ ngayHoaDon: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField required type="date" label="Thời hạn thanh toán" value={form.hanThanhToan || ""} onChange={(e) => setField({ hanThanhToan: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField select label="Chế độ thuế" value={form.cheDoThue} onChange={(e) => setField({ cheDoThue: e.target.value })}>
                            {Object.entries(TAX_MODE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        <TextField select required label="Loại hình doanh thu" value={form.loaiHinhDoanhThu || ""} onChange={(e) => setField({ loaiHinhDoanhThu: e.target.value })}>
                            <MenuItem value="" disabled>Chọn loại hình doanh thu</MenuItem>
                            {Object.entries(REVENUE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        {form.maLoaiHoaDon !== "QuocPhong" && (
                            <TextField required={form.maLoaiHoaDon === "TrongNuoc"} label="Đơn hàng/hợp đồng" value={form.thongTinDonHang || ""} onChange={(e) => setField({ thongTinDonHang: e.target.value })} inputProps={{ maxLength: 500 }} />
                        )}
                        <TextField select label="Loại tiền" value={form.maLoaiTien || "VND"} onChange={(e) => setCurrency(e.target.value)}>
                            {currencyOptions.map((item) => (
                                <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>
                                    {item.MaLoaiTien} - {item.TenLoaiTien}
                                </MenuItem>
                            ))}
                        </TextField>
                        {form.maLoaiTien !== "VND" && (
                            <NumericTextField decimalScale={INVOICE_NUMBER_FORMAT.exchangeRate} label="Tỷ giá" value={form.tyGia || ""} onChange={(value) => setField({ tyGia: value })} />
                        )}
                        {form.cheDoThue === "MotThueSuat" && (
                            <TextField select label="Thuế GTGT" value={String(form.thueSuatChung ?? "0")} onChange={(event) => setField({ thueSuatChung: event.target.value })}>
                                {VAT_RATE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                            </TextField>
                        )}
                        <TextField label="Ký hiệu dự kiến" value={form.kyHieuDuKien || ""} onChange={(e) => setField({ kyHieuDuKien: e.target.value })} placeholder={kyHieuSuggestion} />
                        <TextField label="Mẫu hóa đơn dự kiến" value={form.mauHoaDonDuKien || ""} onChange={(e) => setField({ mauHoaDonDuKien: e.target.value })} />
                    </Box>
                </SectionCard>

                <SectionCard title="Người mua" subtitle="Chọn từ danh mục dùng lại hoặc tạo nhanh ngay trong form. Snapshot được lưu vào hóa đơn.">
                    <BuyerSelector form={form} setForm={setForm} user={user} setToast={setToast} />
                </SectionCard>

                {form.maLoaiHoaDon === "QuocPhong" && (
                    <SectionCard title="Thông tin kiểm soát hàng quốc phòng">
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
                            {form.loaiHinhDoanhThu !== "QuocPhongNhomII" && (
                                <TextField
                                    required
                                    label="Quyết định giao nhiệm vụ"
                                    value={form.quocPhong.quyetDinhGiaoNhiemVu}
                                    onChange={(e) => setQuocPhong({ quyetDinhGiaoNhiemVu: e.target.value })}
                                />
                            )}
                            {form.loaiHinhDoanhThu === "QuocPhongNhomI" && (
                                <TextField
                                    required
                                    label="Nguồn ngân sách"
                                    value={form.quocPhong.nguonNganSach || ""}
                                    onChange={(e) => setQuocPhong({ nguonNganSach: e.target.value })}
                                    inputProps={{ maxLength: 500 }}
                                />
                            )}
                            <TextField
                                required
                                label="Số hợp đồng"
                                value={form.quocPhong.soHopDong}
                                onChange={(e) => setQuocPhong({ soHopDong: e.target.value })}
                            />
                            <TextField required label="Số phiếu xuất" value={form.quocPhong.soPhieuXuat} onChange={(e) => setQuocPhong({ soPhieuXuat: e.target.value })} />
                            <TextField required label="Phê duyệt giá" value={form.quocPhong.pheDuyetGia} onChange={(e) => setQuocPhong({ pheDuyetGia: e.target.value })} />
                        </Box>
                    </SectionCard>
                )}

                <SectionCard
                    title="Hàng hóa / Dịch vụ"
                    subtitle="Tên hàng nhập trực tiếp theo từng hóa đơn, không chuẩn hóa theo danh mục."
                >
                    <Stack spacing={2}>
                        <HoaDonItemGrid
                            lines={form.chiTiet}
                            setLines={(updater) => setForm((current) => ({ ...current, chiTiet: typeof updater === "function" ? updater(current.chiTiet) : updater }))}
                            maLoaiHoaDon={form.maLoaiHoaDon}
                            cheDoThue={form.cheDoThue}
                            thueSuatChung={form.thueSuatChung}
                            tyGia={form.tyGia}
                            currency={form.maLoaiTien}
                        />
                        <HoaDonTotals
                            lines={form.chiTiet.map((line) => ({
                                ...line,
                                thueSuatGTGT: vatRateValue(
                                    form.cheDoThue === "MotThueSuat"
                                        ? form.thueSuatChung
                                        : line.maThueSuatGTGT ?? line.thueSuatGTGT
                                ),
                            }))}
                            tyGia={form.tyGia}
                            currency={form.maLoaiTien}
                            cheDoThue={form.cheDoThue}
                            thueSuatChung={vatRateValue(form.thueSuatChung)}
                        />
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
