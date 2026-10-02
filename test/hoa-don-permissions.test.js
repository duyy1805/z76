import test from "node:test";
import assert from "node:assert/strict";
import { canDownloadUpdatedInvoice } from "../src/utils/hoa-don.js";

const readyDomestic = { maTrangThai: "SanSangXuat", maLoaiHoaDon: "TrongNuoc" };
const issuedExport = { maTrangThai: "DaXuat", maLoaiHoaDon: "XuatKhau" };

test("quyền tải Excel cập nhật giữ nguyên cho hóa đơn Sẵn sàng xuất", () => {
    assert.equal(canDownloadUpdatedInvoice(readyDomestic, { invoicePermissions: ["HD_XuatHoaDon"] }), true);
    assert.equal(canDownloadUpdatedInvoice(readyDomestic, { invoiceTypeCodes: ["TrongNuoc"] }), true);
    assert.equal(canDownloadUpdatedInvoice(readyDomestic, { invoicePermissions: ["HD_XemHoaDonDaXuat"] }), false);
});

test("Admin và các quyền xem hoặc xuất tải được Excel hóa đơn Đã xuất", () => {
    assert.equal(canDownloadUpdatedInvoice(issuedExport, { invoicePermissions: ["HD_Admin"] }), true);
    assert.equal(canDownloadUpdatedInvoice(issuedExport, { invoicePermissions: ["HD_XuatHoaDon"] }), true);
    assert.equal(canDownloadUpdatedInvoice(issuedExport, { invoicePermissions: ["HD_XemHoaDonDaXuat"] }), true);
});

test("người phụ trách chỉ tải được hóa đơn Đã xuất đúng loại được phân công", () => {
    assert.equal(canDownloadUpdatedInvoice(issuedExport, { invoiceTypeCodes: ["XuatKhau"] }), true);
    assert.equal(canDownloadUpdatedInvoice(issuedExport, { invoiceTypeCodes: ["TrongNuoc"] }), false);
    assert.equal(canDownloadUpdatedInvoice(issuedExport, {}), false);
});

test("không mở quyền tải cập nhật cho các trạng thái khác", () => {
    assert.equal(canDownloadUpdatedInvoice({ ...issuedExport, maTrangThai: "KhoiTao" }, { invoicePermissions: ["HD_Admin"] }), false);
    assert.equal(canDownloadUpdatedInvoice({ ...issuedExport, maTrangThai: "ChoXuLy_HoaDon" }, { invoiceTypeCodes: ["XuatKhau"] }), false);
});
