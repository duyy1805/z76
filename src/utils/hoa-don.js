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

export const TAX_MODE_LABELS = {
    MotThueSuat: "Một thuế suất",
    NhieuThueSuat: "Nhiều thuế suất",
};

export const DEFAULT_INVOICE_FORM = {
    maLoaiHoaDon: "TrongNuoc",
    cheDoThue: "MotThueSuat",
    nguoiMuaId: null,
    diaChiId: null,
    lienHeId: null,
    ngayHoaDon: new Date().toISOString().slice(0, 10),
    hinhThucThanhToan: "",
    maLoaiTien: "VND",
    tyGia: 1,
    mauHoaDonDuKien: "",
    kyHieuDuKien: "1C26TAB",
    coBangKe: false,
    tenNguoiMuaSnapshot: "",
    maSoThueSnapshot: "",
    soGiayToSnapshot: "",
    maDonViSnapshot: "",
    diaChiSnapshot: "",
    nguoiLienHeSnapshot: "",
    emailSnapshot: "",
    dienThoaiSnapshot: "",
    thueSuatChung: 0,
    ghiChu: "",
    chiTiet: [emptyInvoiceLine(1)],
    quocPhong: {
        nhaMay: "",
        tenBoPhan: "",
        quyetDinhGiaoNhiemVu: "",
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
    return n.toLocaleString("en-US", {
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction || 4,
    });
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
    const truocCK = soLuong * donGia;
    const tienCK = truocCK * tyLeChietKhau / 100;
    const thanhTien = truocCK - tienCK;
    const tienThue = thanhTien * thueSuatGTGT / 100;
    return {
        truocCK,
        tienCK,
        thanhTien,
        tienThue,
        thanhTienQuyDoi: thanhTien * toNumber(tyGia, 1),
        tienThueQuyDoi: tienThue * toNumber(tyGia, 1),
    };
}

export function calculateTotals(lines = [], tyGia = 1) {
    return lines.reduce((acc, line) => {
        const calc = calculateLine(line, tyGia);
        acc.tongTienHang += calc.thanhTien;
        acc.tongTienThue += calc.tienThue;
        acc.tongTienThanhToan += calc.thanhTien + calc.tienThue;
        acc.tongQuyDoi += calc.thanhTienQuyDoi + calc.tienThueQuyDoi;
        return acc;
    }, { tongTienHang: 0, tongTienThue: 0, tongTienThanhToan: 0, tongQuyDoi: 0 });
}

export function normalizeInvoicePayload(form, user) {
    const isOneTax = form.cheDoThue === "MotThueSuat";
    const tax = toNumber(form.thueSuatChung, 0);
    const chiTiet = (form.chiTiet || []).map((line, index) => ({
        soDong: index + 1,
        maHang: line.maHang || "",
        tenHangHoaDichVu: line.tenHangHoaDichVu || "",
        donViTinh: line.donViTinh || "",
        soLuong: toNumber(line.soLuong, 0),
        donGia: toNumber(line.donGia, 0),
        tyLeChietKhau: toNumber(line.tyLeChietKhau, 0),
        thueSuatGTGT: isOneTax ? tax : toNumber(line.thueSuatGTGT, 0),
        tinhChatHHDV: line.tinhChatHHDV || "",
        ghiChu: line.ghiChu || "",
    }));

    return {
        ...form,
        hinhThucThanhToan: form.hinhThucThanhToan || "",
        requesterUserId: user?.id,
        requesterIdDonVi: user?.idDonVi,
        tyGia: form.maLoaiTien === "VND" ? 1 : toNumber(form.tyGia, 1),
        nguoiMuaId: form.nguoiMuaId ? Number(form.nguoiMuaId) : null,
        diaChiId: form.diaChiId ? Number(form.diaChiId) : null,
        lienHeId: form.lienHeId ? Number(form.lienHeId) : null,
        chiTiet,
        quocPhong: form.maLoaiHoaDon === "QuocPhong" ? {
            ...(form.quocPhong || {}),
            chiTiet: (form.chiTiet || []).map((line, index) => ({
                soDong: index + 1,
                soLuongHopDong: valueOrNull(line.soLuongHopDong),
                donGiaHopDong: valueOrNull(line.donGiaHopDong),
                soLuongThucHien: valueOrNull(line.soLuongThucHien),
                donGiaThucHien: valueOrNull(line.donGiaThucHien),
                soLuongLuyKe: valueOrNull(line.soLuongLuyKe),
                donGiaLuyKe: valueOrNull(line.donGiaLuyKe),
            })),
        } : undefined,
    };
}

function valueOrNull(value) {
    return value === "" || value === null || value === undefined ? null : Number(value);
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
        maLoaiHoaDon: detail.maLoaiHoaDon || "TrongNuoc",
        cheDoThue: detail.cheDoThue || "MotThueSuat",
        nguoiMuaId: detail.nguoiMuaId || null,
        ngayHoaDon: detail.ngayHoaDon ? String(detail.ngayHoaDon).slice(0, 10) : "",
        hinhThucThanhToan: detail.hinhThucThanhToan || "",
        maLoaiTien: detail.maLoaiTien || "VND",
        tyGia: detail.tyGia || 1,
        mauHoaDonDuKien: detail.mauHoaDonDuKien || "",
        kyHieuDuKien: detail.kyHieuDuKien || "",
        tenNguoiMuaSnapshot: detail.tenNguoiMua || "",
        maSoThueSnapshot: detail.maSoThue || "",
        diaChiSnapshot: detail.diaChi || "",
        nguoiLienHeSnapshot: detail.nguoiLienHe || "",
        emailSnapshot: detail.email || "",
        dienThoaiSnapshot: detail.dienThoai || "",
        ghiChu: detail.ghiChu || "",
        thueSuatChung: chiTiet[0]?.thueSuatGTGT ?? 0,
        chiTiet: chiTiet.length ? chiTiet : [emptyInvoiceLine(1)],
        quocPhong: {
            ...DEFAULT_INVOICE_FORM.quocPhong,
            ...(detail.quocPhong || {}),
            nhaMay: detail.quocPhong?.NhaMay || "",
            tenBoPhan: detail.quocPhong?.TenBoPhan || "",
            quyetDinhGiaoNhiemVu: detail.quocPhong?.QuyetDinhGiaoNhiemVu || "",
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
    return ["KhoiTao", "TuChoi"].includes(invoice?.maTrangThai) &&
        (Number(invoice?.nguoiDangKyId) === Number(auth?.user?.id) || hasInvoicePermission(auth, "HD_Admin"));
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
