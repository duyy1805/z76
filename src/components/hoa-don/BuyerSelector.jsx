import { useEffect, useMemo, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import { hoaDonApi } from "../../lib/api";

const COMPANY = "DoanhNghiep";
const PERSON = "CaNhan";
const normalizeBuyerType = (value) => value === PERSON ? PERSON : COMPANY;
const normalizeTaxCode = (value) => String(value || "").replace(/[\s.-]/g, "");
const hasBuyerData = (form) => Boolean(
    form.tenNguoiMuaSnapshot || form.maSoThueSnapshot || form.soGiayToSnapshot || form.maDvcqhnsSnapshot ||
    form.diaChiSnapshot || form.nguoiLienHeSnapshot || form.emailSnapshot || form.dienThoaiSnapshot
);
const emptyBuyerPatch = (loaiNguoiMua) => ({
    loaiNguoiMua: normalizeBuyerType(loaiNguoiMua), khongCoMaSoThue: false, nguoiMuaId: null, diaChiId: null, lienHeId: null,
    tenNguoiMuaSnapshot: "", maSoThueSnapshot: "", soGiayToSnapshot: "",
    maDvcqhnsSnapshot: "", maDonViSnapshot: "", diaChiSnapshot: "", nguoiLienHeSnapshot: "",
    emailSnapshot: "", dienThoaiSnapshot: "",
});

export default function BuyerSelector({ form, setForm, disabled = false, setToast }) {
    const [buyers, setBuyers] = useState([]);
    const [loadingBuyers, setLoadingBuyers] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lastLookedUpTaxCode, setLastLookedUpTaxCode] = useState("");
    const [confirmType, setConfirmType] = useState("");
    const selected = useMemo(
        () => buyers.find((item) => Number(item.NguoiMuaId) === Number(form.nguoiMuaId)) || null,
        [buyers, form.nguoiMuaId]
    );

    const loadBuyers = async (keyword = "") => {
        setLoadingBuyers(true);
        try {
            setBuyers(await hoaDonApi.listNguoiMua({ tukhoa: keyword, take: 50 }));
        } catch {
            setBuyers([]);
        } finally {
            setLoadingBuyers(false);
        }
    };
    useEffect(() => { loadBuyers(); }, []);
    const updateSnapshot = (patch) => setForm((current) => ({ ...current, ...patch }));

    const applyBuyer = async (buyer) => {
        if (!buyer) {
            updateSnapshot(emptyBuyerPatch(form.loaiNguoiMua || COMPANY));
            return;
        }
        try {
            const detail = await hoaDonApi.getNguoiMua(buyer.NguoiMuaId);
            const diaChi = detail.diaChi?.find((item) => item.IsDefault) || detail.diaChi?.[0] || {};
            const lienHe = detail.lienHe?.find((item) => item.IsDefault) || detail.lienHe?.[0] || {};
            const loaiNguoiMua = normalizeBuyerType(detail.LoaiNguoiMua || (detail.MaSoThue || detail.MaDVCQHNS ? COMPANY : PERSON));
            const isOrganization = loaiNguoiMua !== PERSON;
            updateSnapshot({
                loaiNguoiMua,
                khongCoMaSoThue: isOrganization && !detail.MaSoThue && Boolean(detail.MaDVCQHNS),
                nguoiMuaId: detail.NguoiMuaId,
                diaChiId: diaChi.DiaChiId || null,
                lienHeId: lienHe.LienHeId || null,
                tenNguoiMuaSnapshot: detail.TenPhapLy || "",
                maSoThueSnapshot: isOrganization ? detail.MaSoThue || "" : "",
                soGiayToSnapshot: loaiNguoiMua === PERSON ? detail.SoGiayTo || "" : "",
                maDvcqhnsSnapshot: isOrganization ? detail.MaDVCQHNS || "" : "",
                maDonViSnapshot: isOrganization ? detail.MaDonVi || "" : "",
                diaChiSnapshot: diaChi.DiaChi || "",
                nguoiLienHeSnapshot: isOrganization ? lienHe.HoTen || "" : "",
                emailSnapshot: lienHe.Email || "",
                dienThoaiSnapshot: lienHe.DienThoai || "",
            });
            setLastLookedUpTaxCode(normalizeTaxCode(detail.MaSoThue));
        } catch (error) {
            setToast?.({ open: true, type: "error", msg: error?.response?.data?.message || "Không lấy được thông tin người mua." });
        }
    };

    const changeBuyerType = (nextType) => {
        if (!nextType || nextType === normalizeBuyerType(form.loaiNguoiMua)) return;
        if (hasBuyerData(form)) {
            setConfirmType(nextType);
            return;
        }
        updateSnapshot(emptyBuyerPatch(nextType));
        setLastLookedUpTaxCode("");
    };
    const confirmBuyerType = () => {
        updateSnapshot(emptyBuyerPatch(confirmType));
        setLastLookedUpTaxCode("");
        setConfirmType("");
    };

    const lookupTaxCode = async () => {
        const taxCode = normalizeTaxCode(form.maSoThueSnapshot);
        if (!taxCode) {
            setToast?.({ open: true, type: "warning", msg: "Nhập mã số thuế trước khi tra cứu." });
            return;
        }
        if (taxCode === lastLookedUpTaxCode) return;
        setLookupLoading(true);
        try {
            const result = await hoaDonApi.lookupBusinessTaxCode(taxCode);
            setLastLookedUpTaxCode(taxCode);
            if (!result?.found || !result?.data) {
                setToast?.({ open: true, type: "warning", msg: result?.message || "Không tìm thấy doanh nghiệp. Bạn có thể nhập thông tin thủ công." });
                return;
            }
            updateSnapshot({
                maSoThueSnapshot: result.data.maSoThue || taxCode,
                tenNguoiMuaSnapshot: result.data.tenPhapLy || "",
                diaChiSnapshot: result.data.diaChi || "",
            });
            setToast?.({ open: true, type: "success", msg: "Đã lấy thông tin doanh nghiệp từ VietQR." });
        } catch (error) {
            const message = error?.response?.status === 429
                ? "Vượt giới hạn tra cứu, vui lòng thử lại hoặc nhập thủ công."
                : error?.response?.data?.message || "Không tra cứu được MST. Bạn có thể nhập thông tin thủ công.";
            setToast?.({ open: true, type: "warning", msg: message });
        } finally {
            setLookupLoading(false);
        }
    };

    const buyerOptionLabel = (option) => {
        if (!option) return "";
        const identifier = option.MaSoThue || option.MaDVCQHNS || option.SoGiayTo;
        const identifierLabel = option.MaSoThue ? "MST" : option.MaDVCQHNS ? "MĐVCQHNS" : "CCCD";
        return [
            option.TenPhapLy,
            identifier ? `${identifierLabel}: ${identifier}` : "",
            option.NguoiLienHeMacDinh ? `Người mua: ${option.NguoiLienHeMacDinh}` : "",
            option.EmailMacDinh ? `Email: ${option.EmailMacDinh}` : "",
        ].filter(Boolean).join(" • ");
    };
    const isCompany = normalizeBuyerType(form.loaiNguoiMua) === COMPANY;
    const changeIdentifierMode = (withoutTaxCode) => {
        updateSnapshot({
            khongCoMaSoThue: withoutTaxCode,
            maSoThueSnapshot: withoutTaxCode ? "" : form.maSoThueSnapshot,
            maDvcqhnsSnapshot: withoutTaxCode ? form.maDvcqhnsSnapshot : "",
        });
        setLastLookedUpTaxCode("");
    };

    return (
        <Stack spacing={2}>
            <Autocomplete
                disabled={disabled}
                options={buyers}
                slotProps={{ paper: { sx: { minWidth: { md: 760 } } } }}
                loading={loadingBuyers}
                value={selected}
                onInputChange={(_, value, reason) => { if (reason === "input") loadBuyers(value); }}
                onChange={(_, value) => applyBuyer(value)}
                getOptionLabel={buyerOptionLabel}
                isOptionEqualToValue={(option, value) => Number(option?.NguoiMuaId) === Number(value?.NguoiMuaId)}
                renderOption={(props, option) => {
                    const identifier = option.MaSoThue || option.MaDVCQHNS || option.SoGiayTo;
                    const identifierLabel = option.MaSoThue ? "MST" : option.MaDVCQHNS ? "MĐVCQHNS" : "CCCD";
                    const optionType = normalizeBuyerType(option.LoaiNguoiMua || (option.MaSoThue || option.MaDVCQHNS ? COMPANY : PERSON));
                    const typeLabel = optionType === PERSON ? "Cá nhân" : "Tổ chức/Doanh nghiệp";
                    return (
                        <Box
                            component="li"
                            {...props}
                            key={option.NguoiMuaId}
                            sx={{ display: "block !important", py: 1.25 }}
                        >
                            <Typography sx={{ fontWeight: 800 }}>{option.TenPhapLy}</Typography>
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={{ xs: 0.25, md: 2 }}
                                sx={{ mt: 0.35 }}
                            >
                                <Typography variant="caption" color="text.secondary">
                                    Loại: {typeLabel}
                                </Typography>
                                {identifier && (
                                    <Typography variant="caption" color="text.secondary">
                                        {identifierLabel}: {identifier}
                                    </Typography>
                                )}
                                {option.MaDonVi && (
                                    <Typography variant="caption" color="text.secondary">
                                        Mã đơn vị: {option.MaDonVi}
                                    </Typography>
                                )}
                            </Stack>
                            {option.DiaChiMacDinh && (
                                <Typography variant="body2" sx={{ mt: 0.45, overflowWrap: "anywhere" }}>
                                    Địa chỉ: {option.DiaChiMacDinh}
                                </Typography>
                            )}
                            {(option.NguoiLienHeMacDinh || option.EmailMacDinh || option.DienThoaiMacDinh) && (
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={{ xs: 0.25, md: 2 }}
                                    sx={{ mt: 0.35 }}
                                >
                                    {option.NguoiLienHeMacDinh && (
                                        <Typography variant="caption">
                                            Người mua: {option.NguoiLienHeMacDinh}
                                        </Typography>
                                    )}
                                    {option.EmailMacDinh && (
                                        <Typography variant="caption">
                                            Email: {option.EmailMacDinh}
                                        </Typography>
                                    )}
                                    {option.DienThoaiMacDinh && (
                                        <Typography variant="caption">
                                            Điện thoại: {option.DienThoaiMacDinh}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    );
                }}
                renderInput={(params) => <TextField {...params} label="Tìm người mua đã lưu" placeholder="Tên, MST, MĐVCQHNS hoặc CCCD" />}
            />
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>Loại người mua</Typography>
                <ToggleButtonGroup
                    exclusive disabled={disabled} value={normalizeBuyerType(form.loaiNguoiMua)}
                    onChange={(_, value) => changeBuyerType(value)} color="primary" fullWidth
                >
                    <ToggleButton value={COMPANY}><BusinessIcon sx={{ mr: 1 }} />Tổ chức/Doanh nghiệp</ToggleButton>
                    <ToggleButton value={PERSON}><PersonIcon sx={{ mr: 1 }} />Cá nhân</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            {isCompany ? (
                <OrganizationFields
                    form={form} disabled={disabled} lookupLoading={lookupLoading}
                    canLookup={Boolean(normalizeTaxCode(form.maSoThueSnapshot)) && normalizeTaxCode(form.maSoThueSnapshot) !== lastLookedUpTaxCode}
                    onLookup={lookupTaxCode} onIdentifierModeChange={changeIdentifierMode} updateSnapshot={updateSnapshot}
                />
            ) : <PersonFields form={form} disabled={disabled} updateSnapshot={updateSnapshot} />}
            <Dialog open={Boolean(confirmType)} onClose={() => setConfirmType("")} maxWidth="xs" fullWidth>
                <DialogTitle>Đổi loại người mua?</DialogTitle>
                <DialogContent>Dữ liệu người mua đang nhập sẽ bị xóa để tránh lưu lẫn thông tin công ty và cá nhân.</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmType("")}>Hủy</Button>
                    <Button variant="contained" onClick={confirmBuyerType}>Đổi loại</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}

function OrganizationFields({ form, disabled, lookupLoading, canLookup, onLookup, onIdentifierModeChange, updateSnapshot }) {
    const withoutTaxCode = Boolean(form.khongCoMaSoThue);
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
            <FormControlLabel
                sx={{ gridColumn: { md: "1 / -1" }, m: 0 }}
                control={<Switch checked={withoutTaxCode} disabled={disabled} onChange={(event) => onIdentifierModeChange(event.target.checked)} />}
                label="Đơn vị không có mã số thuế"
            />
            {withoutTaxCode ? (
                <TextField required disabled={disabled} label="MĐVCQHNS" value={form.maDvcqhnsSnapshot || ""}
                    onChange={(e) => updateSnapshot({ maDvcqhnsSnapshot: e.target.value })} sx={{ gridColumn: { md: "span 2" } }} />
            ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ gridColumn: { md: "span 2" } }}>
                    <TextField fullWidth required disabled={disabled} label="Mã số thuế" value={form.maSoThueSnapshot || ""}
                        onChange={(e) => updateSnapshot({ maSoThueSnapshot: e.target.value })} />
                    <Button variant="outlined" startIcon={lookupLoading ? <CircularProgress size={18} /> : <PublicIcon />}
                        disabled={disabled || lookupLoading || !canLookup} onClick={onLookup} sx={{ minWidth: 150, whiteSpace: "nowrap" }}>
                        Lấy thông tin
                    </Button>
                </Stack>
            )}
            <TextField disabled={disabled} label="Mã đơn vị" value={form.maDonViSnapshot || ""} onChange={(e) => updateSnapshot({ maDonViSnapshot: e.target.value })} />
            <TextField required disabled={disabled} label="Tên đơn vị" value={form.tenNguoiMuaSnapshot || ""} onChange={(e) => updateSnapshot({ tenNguoiMuaSnapshot: e.target.value })} sx={{ gridColumn: { md: "span 2" } }} />
            <TextField required disabled={disabled} label="Địa chỉ" value={form.diaChiSnapshot || ""} onChange={(e) => updateSnapshot({ diaChiSnapshot: e.target.value })} sx={{ gridColumn: { md: "1 / -1" } }} />
            <TextField disabled={disabled} label="Người mua hàng" value={form.nguoiLienHeSnapshot || ""} onChange={(e) => updateSnapshot({ nguoiLienHeSnapshot: e.target.value })} />
            <TextField disabled={disabled} type="email" label="Email" value={form.emailSnapshot || ""} onChange={(e) => updateSnapshot({ emailSnapshot: e.target.value })} />
            <TextField disabled={disabled} label="Số điện thoại" value={form.dienThoaiSnapshot || ""} onChange={(e) => updateSnapshot({ dienThoaiSnapshot: e.target.value })} />
        </Box>
    );
}

function PersonFields({ form, disabled, updateSnapshot }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 1.5 }}>
            <TextField required disabled={disabled} label="Họ tên người mua" value={form.tenNguoiMuaSnapshot || ""} onChange={(e) => updateSnapshot({ tenNguoiMuaSnapshot: e.target.value })} />
            <TextField disabled={disabled} label="Căn cước công dân" value={form.soGiayToSnapshot || ""} onChange={(e) => updateSnapshot({ soGiayToSnapshot: e.target.value })} />
            <TextField required disabled={disabled} label="Địa chỉ" value={form.diaChiSnapshot || ""} onChange={(e) => updateSnapshot({ diaChiSnapshot: e.target.value })} sx={{ gridColumn: { md: "1 / -1" } }} />
            <TextField disabled={disabled} type="email" label="Email" value={form.emailSnapshot || ""} onChange={(e) => updateSnapshot({ emailSnapshot: e.target.value })} />
            <TextField disabled={disabled} label="Số điện thoại" value={form.dienThoaiSnapshot || ""} onChange={(e) => updateSnapshot({ dienThoaiSnapshot: e.target.value })} />
            <Alert severity="info" sx={{ gridColumn: { md: "1 / -1" } }}>Thông tin cá nhân được nhập trực tiếp và không gửi đến VietQR.</Alert>
        </Box>
    );
}
