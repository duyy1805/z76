export function invoiceOrderContractInfo(invoice) {
    return [...new Set([invoice.thongTinDonHang, invoice.thongTinHoaDon]
        .map((value) => String(value || "").trim()).filter(Boolean))].join("; ");
}

export const INVOICE_STATUS_LABELS = {
    KhoiTao: "Nháp",
    ChoDuyet_TBP: "Chờ TBP duyệt",
    ChoXuLy_HoaDon: "Chờ phụ trách hóa đơn",
    SanSangXuat: "Sẵn sàng xuất",
    DaXuat: "Đã xuất",
    TuChoi: "Từ chối",
};

export const INVOICE_STATUS_OPTIONS = Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export const INVOICE_TYPE_LABELS = {
    TrongNuoc: "Hóa đơn trong nước",
    XuatKhau: "Hóa đơn xuất khẩu",
    QuocPhong: "Hóa đơn hàng quốc phòng",
};

export const EXPORT_INVOICE_SYMBOL = "1C26TXK";

export function issuedInvoiceSymbol(invoice) {
    return invoice?.kyHieuHoaDon
        || invoice?.kyHieuDuKien
        || (invoice?.maLoaiHoaDon === "XuatKhau" ? EXPORT_INVOICE_SYMBOL : "");
}

export const TAX_MODE_LABELS = {
    MotThueSuat: "Một thuế suất",
    NhieuThueSuat: "Nhiều thuế suất",
};

export const REVENUE_TYPE_LABELS = {
    KinhDoanhThuongMai: "Kinh doanh thương mại",
    KinhTeNoiDia: "Kinh tế nội địa",
    QuocPhongNhomI: "Quốc phòng nhóm I",
    QuocPhongNhomII: "Quốc phòng nhóm II",
    XuatKhau: "Xuất khẩu",
};

export const VAT_RATE_OPTIONS = [
    { value: "0", label: "0%", rate: 0 },
    { value: "5", label: "5%", rate: 5 },
    { value: "8", label: "8%", rate: 8 },
    { value: "10", label: "10%", rate: 10 },
    { value: "KCT", label: "KCT", rate: 0 },
    { value: "KKKNT", label: "KKKNT", rate: 0 },
    { value: "KHAC", label: "KHAC", rate: 0 },
];

export function vatRateValue(code) {
    return VAT_RATE_OPTIONS.find((option) => option.value === String(code ?? ""))?.rate ?? 0;
}

export function vatRateLabel(code, fallbackRate = 0) {
    return VAT_RATE_OPTIONS.find((option) => option.value === String(code ?? ""))?.label
        || `${Number(fallbackRate || 0)}%`;
}

export const INVOICE_NUMBER_FORMAT = {
    storageAmount: 4,
    convertedAmount: 0,
    convertedUnitPrice: 5,
    exchangeRate: 0,
    foreignAmount: 3,
    foreignUnitPrice: 3,
    percentage: 2,
    quantity: 2,
};

export const DEFAULT_INVOICE_FORM = {
    maLoaiHoaDon: "TrongNuoc",
    cheDoThue: "MotThueSuat",
    loaiHinhDoanhThu: "",
    thongTinHoaDon: "",
    thongTinDonHang: "",
    nguoiMuaId: null,
    loaiNguoiMua: "DoanhNghiep",
    khongCoMaSoThue: false,
    diaChiId: null,
    lienHeId: null,
    ngayHoaDon: new Date().toISOString().slice(0, 10),
    hanThanhToan: "",
    hinhThucThanhToan: "",
    maLoaiTien: "VND",
    tyGia: 1,
    mauHoaDonDuKien: "",
    kyHieuDuKien: "1C26TAB",
    coBangKe: false,
    tenNguoiMuaSnapshot: "",
    maSoThueSnapshot: "",
    soGiayToSnapshot: "",
    maDvcqhnsSnapshot: "",
    maDonViSnapshot: "",
    diaChiSnapshot: "",
    nguoiLienHeSnapshot: "",
    emailSnapshot: "",
    dienThoaiSnapshot: "",
    thueSuatChung: "0",
    ghiChu: "",
    chiTiet: [emptyInvoiceLine(1)],
    quocPhong: {
        quyetDinhGiaoNhiemVu: "",
        nguonNganSach: "",
        soHopDong: "",
        soPhieuXuat: "",
        pheDuyetGia: "",
        ghiChuKiemSoat: "",
        chiTiet: [],
    },
};

export function emptyInvoiceLine(soDong = 1) {
    return {
        soDong,
        maHang: "",
        tenHangHoaDichVu: "",
        donViTinh: "",
        soLuong: "",
        donGia: "",
        tyLeChietKhau: 0,
        thueSuatGTGT: "",
        maThueSuatGTGT: "",
        tinhChatHHDV: "",
        ghiChu: "",
        soLuongHopDong: "",
        donGiaHopDong: "",
        soLuongThucHien: "",
        donGiaThucHien: "",
        soLuongLuyKe: "",
        donGiaLuyKe: "",
    };
}

export function fmtMoney(value, fraction = 0) {
    const n = Number(value || 0);
    return n.toLocaleString("vi-VN", {
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
    });
}

export function currencyAmountScale(currency = "VND") {
    return String(currency).toUpperCase() === "VND"
        ? INVOICE_NUMBER_FORMAT.convertedAmount
        : INVOICE_NUMBER_FORMAT.foreignAmount;
}

export function currencyUnitPriceScale(currency = "VND") {
    return String(currency).toUpperCase() === "VND"
        ? INVOICE_NUMBER_FORMAT.convertedUnitPrice
        : INVOICE_NUMBER_FORMAT.foreignUnitPrice;
}

export function roundInvoiceNumber(value, fraction) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    const factor = 10 ** fraction;
    return Math.round((n + Number.EPSILON) * factor) / factor;
}

export function toNumber(value, fallback = 0) {
    if (value === "" || value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function calculateLine(line, tyGia = 1) {
    const soLuong = toNumber(line.soLuong, 0);
    const donGia = toNumber(line.donGia, 0);
    const tyLeChietKhau = toNumber(line.tyLeChietKhau, 0);
    const thueSuatGTGT = toNumber(line.thueSuatGTGT, 0);
    const truocCK = roundInvoiceNumber(soLuong * donGia, INVOICE_NUMBER_FORMAT.storageAmount);
    const tienCK = roundInvoiceNumber(soLuong * donGia * tyLeChietKhau / 100, INVOICE_NUMBER_FORMAT.storageAmount);
    const thanhTien = roundInvoiceNumber(soLuong * donGia * (100 - tyLeChietKhau) / 100, INVOICE_NUMBER_FORMAT.storageAmount);
    const tienThue = roundInvoiceNumber(thanhTien * thueSuatGTGT / 100, INVOICE_NUMBER_FORMAT.storageAmount);
    return {
        truocCK,
        tienCK,
        thanhTien,
        tienThue,
        thanhTienQuyDoi: roundInvoiceNumber(thanhTien * toNumber(tyGia, 1), INVOICE_NUMBER_FORMAT.storageAmount),
        tienThueQuyDoi: roundInvoiceNumber(tienThue * toNumber(tyGia, 1), INVOICE_NUMBER_FORMAT.storageAmount),
    };
}

export function calculateTotals(lines = [], tyGia = 1, cheDoThue = "NhieuThueSuat", thueSuatChung = null) {
    const totals = lines.reduce((acc, line) => {
        const calc = calculateLine(line, tyGia);
        acc.tongTienHang += calc.thanhTien;
        acc.tongTienThue += calc.tienThue;
        acc.tongTienThanhToan += calc.thanhTien + calc.tienThue;
        acc.tongTienHangQuyDoi += calc.thanhTienQuyDoi;
        acc.tongTienThueQuyDoi += calc.tienThueQuyDoi;
        acc.tongQuyDoi += calc.thanhTienQuyDoi + calc.tienThueQuyDoi;
        return acc;
    }, {
        tongTienHang: 0,
        tongTienThue: 0,
        tongTienThanhToan: 0,
        tongTienHangQuyDoi: 0,
        tongTienThueQuyDoi: 0,
        tongQuyDoi: 0,
    });

    if (cheDoThue === "MotThueSuat") {
        const commonRate = toNumber(thueSuatChung ?? lines[0]?.thueSuatGTGT, 0);
        totals.tongTienThue = roundInvoiceNumber(totals.tongTienHang * commonRate / 100, 4);
        totals.tongTienThanhToan = roundInvoiceNumber(totals.tongTienHang + totals.tongTienThue, INVOICE_NUMBER_FORMAT.storageAmount);
        totals.tongTienThueQuyDoi = roundInvoiceNumber(
            totals.tongTienThue * toNumber(tyGia, 1),
            INVOICE_NUMBER_FORMAT.storageAmount
        );
        totals.tongQuyDoi = roundInvoiceNumber(totals.tongTienHangQuyDoi + totals.tongTienThueQuyDoi, INVOICE_NUMBER_FORMAT.storageAmount);
    }

    for (const key of Object.keys(totals)) {
        totals[key] = roundInvoiceNumber(totals[key], INVOICE_NUMBER_FORMAT.storageAmount);
    }

    return totals;
}

export function normalizeInvoicePayload(form, user) {
    const isOneTax = form.cheDoThue === "MotThueSuat";
    const isCompany = form.loaiNguoiMua !== "CaNhan";
    const withoutTaxCode = isCompany && Boolean(form.khongCoMaSoThue);
    const chiTiet = (form.chiTiet || []).map((line, index) => ({
        soDong: index + 1,
        maHang: line.maHang || "",
        tenHangHoaDichVu: line.tenHangHoaDichVu || "",
        donViTinh: line.donViTinh || "",
        soLuong: roundInvoiceNumber(line.soLuong, INVOICE_NUMBER_FORMAT.quantity),
        donGia: roundInvoiceNumber(line.donGia, currencyUnitPriceScale(form.maLoaiTien)),
        tyLeChietKhau: roundInvoiceNumber(line.tyLeChietKhau, INVOICE_NUMBER_FORMAT.percentage),
        maThueSuatGTGT: isOneTax ? String(form.thueSuatChung ?? "") : String(line.maThueSuatGTGT ?? line.thueSuatGTGT ?? ""),
        thueSuatGTGT: roundInvoiceNumber(
            vatRateValue(isOneTax ? form.thueSuatChung : line.maThueSuatGTGT ?? line.thueSuatGTGT),
            INVOICE_NUMBER_FORMAT.percentage
        ),
        tinhChatHHDV: line.tinhChatHHDV || "",
        ghiChu: line.ghiChu || "",
    }));

    return {
        ...form,
        thongTinHoaDon: "",
        thongTinDonHang: form.maLoaiHoaDon === "QuocPhong" ? "" : String(form.thongTinDonHang || "").trim(),
        loaiNguoiMua: isCompany ? "DoanhNghiep" : "CaNhan",
        khongCoMaSoThue: withoutTaxCode,
        maSoThueSnapshot: isCompany && !withoutTaxCode ? String(form.maSoThueSnapshot || "").replace(/[\s.-]/g, "") : "",
        soGiayToSnapshot: isCompany ? "" : String(form.soGiayToSnapshot || "").replace(/\s/g, ""),
        maDvcqhnsSnapshot: withoutTaxCode ? String(form.maDvcqhnsSnapshot || "").trim() : "",
        maDonViSnapshot: isCompany ? form.maDonViSnapshot || "" : "",
        nguoiLienHeSnapshot: isCompany ? form.nguoiLienHeSnapshot || "" : "",
        hanThanhToan: form.hanThanhToan || "",
        hinhThucThanhToan: form.hinhThucThanhToan || "",
        requesterUserId: user?.id,
        requesterIdDonVi: user?.idDonVi,
        tyGia: form.maLoaiTien === "VND" ? 1 : roundInvoiceNumber(form.tyGia, INVOICE_NUMBER_FORMAT.exchangeRate),
        nguoiMuaId: form.nguoiMuaId ? Number(form.nguoiMuaId) : null,
        diaChiId: form.diaChiId ? Number(form.diaChiId) : null,
        lienHeId: form.lienHeId ? Number(form.lienHeId) : null,
        chiTiet,
        quocPhong: form.maLoaiHoaDon === "QuocPhong" ? {
            ...(form.quocPhong || {}),
            chiTiet: (form.chiTiet || []).map((line, index) => ({
                soDong: index + 1,
                soLuongHopDong: valueOrNull(line.soLuongHopDong, INVOICE_NUMBER_FORMAT.quantity),
                donGiaHopDong: valueOrNull(line.donGiaHopDong, currencyUnitPriceScale(form.maLoaiTien)),
                soLuongThucHien: valueOrNull(line.soLuongThucHien, INVOICE_NUMBER_FORMAT.quantity),
                donGiaThucHien: valueOrNull(line.donGiaThucHien, currencyUnitPriceScale(form.maLoaiTien)),
                soLuongLuyKe: valueOrNull(line.soLuongLuyKe, INVOICE_NUMBER_FORMAT.quantity),
                donGiaLuyKe: valueOrNull(line.donGiaLuyKe, currencyUnitPriceScale(form.maLoaiTien)),
            })),
        } : undefined,
    };
}

function valueOrNull(value, fraction) {
    return value === "" || value === null || value === undefined
        ? null
        : roundInvoiceNumber(value, fraction);
}

function zeroToBlank(value) {
    return value === null || value === undefined || Number(value) === 0 ? "" : value;
}

export function invoiceToForm(detail) {
    if (!detail) return { ...DEFAULT_INVOICE_FORM, chiTiet: [emptyInvoiceLine(1)] };
    const chiTiet = (detail.chiTiet || []).map((line, index) => {
        const qp = (detail.quocPhongChiTiet || []).find((item) => Number(item.ChiTietId) === Number(line.ChiTietId)) || {};
        return {
            soDong: line.SoDong || index + 1,
            maHang: line.MaHang || "",
            tenHangHoaDichVu: line.TenHangHoaDichVu || "",
            donViTinh: line.DonViTinh || "",
            soLuong: zeroToBlank(line.SoLuong),
            donGia: zeroToBlank(line.DonGia),
            tyLeChietKhau: line.TyLeChietKhau ?? 0,
            thueSuatGTGT: line.ThueSuatGTGT ?? "",
            maThueSuatGTGT: line.MaThueSuatGTGT || String(line.ThueSuatGTGT ?? ""),
            tinhChatHHDV: line.TinhChatHHDV || "",
            ghiChu: line.GhiChu || "",
            soLuongHopDong: qp.SoLuongHopDong ?? "",
            donGiaHopDong: qp.DonGiaHopDong ?? "",
            soLuongThucHien: qp.SoLuongThucHien ?? "",
            donGiaThucHien: qp.DonGiaThucHien ?? "",
            soLuongLuyKe: qp.SoLuongLuyKe ?? "",
            donGiaLuyKe: qp.DonGiaLuyKe ?? "",
        };
    });

    return {
        ...DEFAULT_INVOICE_FORM,
        maLoaiHoaDon: detail.isImportIncomplete ? (detail.maLoaiHoaDon || "") : (detail.maLoaiHoaDon || "TrongNuoc"),
        cheDoThue: detail.cheDoThue || "MotThueSuat",
        loaiHinhDoanhThu: detail.loaiHinhDoanhThu || "",
        thongTinHoaDon: "",
        thongTinDonHang: invoiceOrderContractInfo(detail),
        nguoiMuaId: detail.nguoiMuaId || null,
        loaiNguoiMua: detail.loaiNguoiMua === "CaNhan" ? "CaNhan" : "DoanhNghiep",
        khongCoMaSoThue: !detail.maSoThue && Boolean(detail.maDvcqhns),
        ngayHoaDon: detail.ngayHoaDon ? String(detail.ngayHoaDon).slice(0, 10) : "",
        hanThanhToan: detail.hanThanhToan ? String(detail.hanThanhToan).slice(0, 10) : "",
        hinhThucThanhToan: detail.hinhThucThanhToan || "",
        maLoaiTien: detail.maLoaiTien || "VND",
        tyGia: detail.tyGia || 1,
        mauHoaDonDuKien: detail.mauHoaDonDuKien || "",
        kyHieuDuKien: detail.kyHieuDuKien || "",
        tenNguoiMuaSnapshot: detail.tenNguoiMua || "",
        maSoThueSnapshot: detail.maSoThue || "",
        soGiayToSnapshot: detail.soGiayTo || "",
        maDvcqhnsSnapshot: detail.maDvcqhns || "",
        maDonViSnapshot: detail.maDonVi || "",
        diaChiSnapshot: detail.diaChi || "",
        nguoiLienHeSnapshot: detail.nguoiLienHe || "",
        emailSnapshot: detail.email || "",
        dienThoaiSnapshot: detail.dienThoai || "",
        ghiChu: detail.ghiChu || "",
        thueSuatChung: chiTiet[0]?.maThueSuatGTGT || String(chiTiet[0]?.thueSuatGTGT ?? "0"),
        chiTiet: chiTiet.length ? chiTiet : [emptyInvoiceLine(1)],
        quocPhong: {
            ...DEFAULT_INVOICE_FORM.quocPhong,
            ...(detail.quocPhong || {}),
            quyetDinhGiaoNhiemVu: detail.quocPhong?.QuyetDinhGiaoNhiemVu || "",
            nguonNganSach: detail.quocPhong?.NguonNganSach || "",
            soHopDong: detail.quocPhong?.SoHopDong || "",
            soPhieuXuat: detail.quocPhong?.SoPhieuXuat || "",
            pheDuyetGia: detail.quocPhong?.PheDuyetGia || "",
            ghiChuKiemSoat: detail.quocPhong?.GhiChuKiemSoat || "",
        },
    };
}

export function canEditInvoice(invoice, auth) {
    return invoice?.maTrangThai === "KhoiTao" &&
        (Number(invoice?.nguoiDangKyId) === Number(auth?.user?.id) || hasInvoicePermission(auth, "HD_Admin"));
}

export function canSubmitInvoice(invoice, auth) {
    return canEditInvoice(invoice, auth);
}

export function canDeleteInvoice(invoice, auth) {
    if (!invoice) return false;
    if (hasInvoicePermission(auth, "HD_Admin")) return true;
    return ["KhoiTao", "TuChoi"].includes(invoice.maTrangThai) &&
        Number(invoice.nguoiDangKyId) === Number(auth?.user?.id);
}

export function canApproveInvoice(invoice, auth) {
    if (!invoice) return false;
    if (hasInvoicePermission(auth, "HD_Admin")) return ["ChoDuyet_TBP", "ChoXuLy_HoaDon"].includes(invoice.maTrangThai);
    if (invoice.maTrangThai === "ChoDuyet_TBP") return hasInvoicePermission(auth, "HD_TBP") || hasSosecPermission(auth, "TBP");
    if (invoice.maTrangThai === "ChoXuLy_HoaDon") {
        return hasInvoicePermission(auth, "HD_XuatHoaDon") || (auth.invoiceTypeCodes || []).includes(invoice.maLoaiHoaDon);
    }
    return false;
}

export function canProcessInvoiceExportInfo(invoice, auth) {
    return invoice?.maTrangThai === "ChoXuLy_HoaDon" && canApproveInvoice(invoice, auth);
}

export function canConfirmInvoiceExported(invoice, auth) {
    return invoice?.maTrangThai === "SanSangXuat" &&
        (
            hasInvoicePermission(auth, "HD_Admin") ||
            hasInvoicePermission(auth, "HD_XuatHoaDon") ||
            (auth?.invoiceTypeCodes || []).includes(invoice.maLoaiHoaDon)
        );
}

export function isInvoiceExportInfoComplete(invoice) {
    if (!invoice) return false;
    if (!invoice.hinhThucThanhToan) return false;
    if (!invoice.cheDoThue) return false;
    if (!invoice.maLoaiTien) return false;
    if (toNumber(invoice.tyGia, 0) <= 0) return false;
    const lines = invoice.chiTiet || [];
    if (!lines.length) return false;
    return lines.every((line) => line.ThueSuatGTGT !== null && line.ThueSuatGTGT !== undefined && Number(line.ThueSuatGTGT) >= 0);
}

export function hasInvoicePermission(auth, code) {
    return auth?.invoiceRole === code ||
        auth?.invoiceRole === "HD_Admin" ||
        (auth?.invoicePermissions || []).includes(code) ||
        (auth?.invoicePermissions || []).includes("HD_Admin");
}

function hasSosecPermission(auth, code) {
    return auth?.role === code || (auth?.permissions || []).includes(code);
}
