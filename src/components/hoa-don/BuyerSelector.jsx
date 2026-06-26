import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { hoaDonApi } from "../../lib/api";

export default function BuyerSelector({ form, setForm, user, disabled = false, setToast }) {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quick, setQuick] = useState({
        tenPhapLy: "",
        maSoThue: "",
        maDonVi: "",
        diaChi: "",
        hoTen: "",
        email: "",
        dienThoai: "",
        laKhachHangNuocNgoai: false,
    });

    const selected = useMemo(
        () => buyers.find((item) => Number(item.NguoiMuaId) === Number(form.nguoiMuaId)) || null,
        [buyers, form.nguoiMuaId]
    );

    const loadBuyers = async (keyword = "") => {
        setLoading(true);
        try {
            setBuyers(await hoaDonApi.listNguoiMua({ tukhoa: keyword, take: 50 }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBuyers();
    }, []);

    const applyBuyer = async (buyer) => {
        if (!buyer) {
            setForm((current) => ({
                ...current,
                nguoiMuaId: null,
                diaChiId: null,
                lienHeId: null,
                tenNguoiMuaSnapshot: "",
                maSoThueSnapshot: "",
                soGiayToSnapshot: "",
                maDonViSnapshot: "",
                diaChiSnapshot: "",
                nguoiLienHeSnapshot: "",
                emailSnapshot: "",
                dienThoaiSnapshot: "",
            }));
            return;
        }

        const detail = await hoaDonApi.getNguoiMua(buyer.NguoiMuaId);
        const diaChi = detail.diaChi?.find((item) => item.IsDefault) || detail.diaChi?.[0] || {};
        const lienHe = detail.lienHe?.find((item) => item.IsDefault) || detail.lienHe?.[0] || {};

        setForm((current) => ({
            ...current,
            nguoiMuaId: detail.NguoiMuaId,
            diaChiId: diaChi.DiaChiId || null,
            lienHeId: lienHe.LienHeId || null,
            tenNguoiMuaSnapshot: detail.TenPhapLy || "",
            maSoThueSnapshot: detail.MaSoThue || "",
            soGiayToSnapshot: detail.SoGiayTo || "",
            maDonViSnapshot: detail.MaDonVi || "",
            diaChiSnapshot: diaChi.DiaChi || "",
            nguoiLienHeSnapshot: lienHe.HoTen || "",
            emailSnapshot: lienHe.Email || "",
            dienThoaiSnapshot: lienHe.DienThoai || "",
        }));
    };

    const createQuickBuyer = async () => {
        if (!quick.tenPhapLy.trim()) {
            setToast?.({ open: true, type: "warning", msg: "Nhập tên pháp lý người mua." });
            return;
        }
        const requesterUserId = user?.id;
        const buyer = await hoaDonApi.createNguoiMua({
            requesterUserId,
            tenPhapLy: quick.tenPhapLy,
            maSoThue: quick.maSoThue,
            maDonVi: quick.maDonVi,
            laKhachHangNuocNgoai: quick.laKhachHangNuocNgoai,
        });
        if (quick.diaChi) {
            await hoaDonApi.createNguoiMuaDiaChi(buyer.NguoiMuaId, {
                requesterUserId,
                diaChi: quick.diaChi,
                isDefault: true,
            });
        }
        if (quick.hoTen || quick.email || quick.dienThoai) {
            await hoaDonApi.createNguoiMuaLienHe(buyer.NguoiMuaId, {
                requesterUserId,
                hoTen: quick.hoTen || quick.tenPhapLy,
                email: quick.email,
                dienThoai: quick.dienThoai,
                isDefault: true,
            });
        }

        await loadBuyers(quick.tenPhapLy);
        await applyBuyer(buyer);
        setQuickOpen(false);
        setQuick({
            tenPhapLy: "",
            maSoThue: "",
            maDonVi: "",
            diaChi: "",
            hoTen: "",
            email: "",
            dienThoai: "",
            laKhachHangNuocNgoai: false,
        });
        setToast?.({ open: true, type: "success", msg: "Đã tạo và chọn người mua." });
    };

    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "flex-start" }}>
                <Autocomplete
                    sx={{ flex: 1 }}
                    disabled={disabled}
                    options={buyers}
                    loading={loading}
                    value={selected}
                    onInputChange={(_, value, reason) => {
                        if (reason === "input") loadBuyers(value);
                    }}
                    onChange={(_, value) => applyBuyer(value)}
                    getOptionLabel={(option) => option?.TenPhapLy || ""}
                    isOptionEqualToValue={(option, value) => Number(option?.NguoiMuaId) === Number(value?.NguoiMuaId)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.NguoiMuaId} sx={{ display: "block !important" }}>
                            <Typography>{option.TenPhapLy}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                MST: {option.MaSoThue || "—"} · Địa chỉ: {option.DiaChiMacDinh || "—"}
                            </Typography>
                        </Box>
                    )}
                    renderInput={(params) => (
                        <TextField {...params} label="Tìm/chọn người mua" placeholder="Tên, mã số thuế hoặc mã khách hàng" />
                    )}
                />
                {!disabled && (
                    <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setQuickOpen((value) => !value)} sx={{ minHeight: 54 }}>
                        Tạo nhanh
                    </Button>
                )}
            </Stack>

            {quickOpen && !disabled && (
                <Alert severity="info" icon={false} sx={{ borderRadius: 2 }}>
                    <Stack spacing={1.5}>
                        <Typography sx={{ fontWeight: 800 }}>Tạo nhanh người mua</Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 1.25 }}>
                            <TextField label="Tên pháp lý *" value={quick.tenPhapLy} onChange={(e) => setQuick({ ...quick, tenPhapLy: e.target.value })} />
                            <TextField label="Mã số thuế/CCCD" value={quick.maSoThue} onChange={(e) => setQuick({ ...quick, maSoThue: e.target.value })} />
                            <TextField label="Mã đơn vị" value={quick.maDonVi} onChange={(e) => setQuick({ ...quick, maDonVi: e.target.value })} />
                            <TextField label="Địa chỉ mặc định" value={quick.diaChi} onChange={(e) => setQuick({ ...quick, diaChi: e.target.value })} sx={{ gridColumn: { md: "1 / -1" } }} />
                            <TextField label="Người liên hệ" value={quick.hoTen} onChange={(e) => setQuick({ ...quick, hoTen: e.target.value })} />
                            <TextField label="Email" value={quick.email} onChange={(e) => setQuick({ ...quick, email: e.target.value })} />
                            <TextField label="Điện thoại" value={quick.dienThoai} onChange={(e) => setQuick({ ...quick, dienThoai: e.target.value })} />
                            <FormControlLabel control={<Checkbox checked={quick.laKhachHangNuocNgoai} onChange={(e) => setQuick({ ...quick, laKhachHangNuocNgoai: e.target.checked })} />} label="Khách hàng nước ngoài" />
                        </Box>
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Button onClick={() => setQuickOpen(false)}>Đóng</Button>
                            <Button variant="contained" onClick={createQuickBuyer}>Tạo và chọn</Button>
                        </Stack>
                    </Stack>
                </Alert>
            )}

            <BuyerSnapshotCard form={form} />
        </Stack>
    );
}

function BuyerSnapshotCard({ form }) {
    const hasBuyer = Boolean(form.tenNguoiMuaSnapshot || form.maSoThueSnapshot || form.diaChiSnapshot);
    const fields = [
        { label: "Tên đơn vị mua hàng", value: form.tenNguoiMuaSnapshot, wide: true },
        { label: "Mã số thuế/CCCD", value: form.maSoThueSnapshot || form.soGiayToSnapshot },
        { label: "Mã đơn vị", value: form.maDonViSnapshot },
        { label: "Địa chỉ", value: form.diaChiSnapshot, wide: true },
        { label: "Người mua hàng", value: form.nguoiLienHeSnapshot },
        { label: "Email", value: form.emailSnapshot },
        { label: "Số điện thoại", value: form.dienThoaiSnapshot },
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.5, md: 2 },
                borderRadius: 2.5,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: "#F8FAFC",
            }}
        >
            <Stack spacing={1.5}>
                <Box>
                    <Typography sx={{ fontWeight: 850 }}>Thông tin sẽ ghi lên hóa đơn</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Chỉ chọn/tạo người mua ở phía trên. Dữ liệu dưới đây là snapshot hiển thị, không nhập tay.
                    </Typography>
                </Box>

                {!hasBuyer ? (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        Chưa chọn người mua. Hãy chọn từ danh mục hoặc tạo nhanh người mua mới.
                    </Alert>
                ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr 1fr" }, gap: 1.25 }}>
                        {fields.map((item) => (
                            <InfoTile key={item.label} label={item.label} value={item.value} wide={item.wide} />
                        ))}
                    </Box>
                )}
            </Stack>
        </Paper>
    );
}

function InfoTile({ label, value, wide }) {
    return (
        <Box
            sx={{
                gridColumn: wide ? { xs: "auto", md: "span 2" } : "auto",
                minWidth: 0,
                p: 1.25,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography sx={{ mt: 0.35, fontWeight: 750, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                {value || "—"}
            </Typography>
        </Box>
    );
}
