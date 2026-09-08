import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotals, invoiceToForm, issuedInvoiceSymbol, normalizeInvoicePayload } from "../src/utils/hoa-don.js";

test("ký hiệu phát hành mặc định của hóa đơn xuất khẩu là 1C26TXK", () => {
    assert.equal(issuedInvoiceSymbol({ maLoaiHoaDon: "XuatKhau" }), "1C26TXK");
    assert.equal(issuedInvoiceSymbol({ maLoaiHoaDon: "TrongNuoc" }), "");
    assert.equal(issuedInvoiceSymbol({ maLoaiHoaDon: "XuatKhau", kyHieuDuKien: "1C26ABC" }), "1C26ABC");
});

test("ánh xạ thông tin hóa đơn, đơn hàng và nguồn ngân sách khi sửa", () => {
    const form = invoiceToForm({
        thongTinHoaDon: "HĐ theo phụ lục 01",
        thongTinDonHang: "ĐH-2026-09",
        quocPhong: { NguonNganSach: "Ngân sách quốc phòng" },
    });

    assert.equal(form.thongTinHoaDon, "HĐ theo phụ lục 01");
    assert.equal(form.thongTinDonHang, "ĐH-2026-09");
    assert.equal(form.quocPhong.nguonNganSach, "Ngân sách quốc phòng");
});

test("payload quốc phòng nhóm II giữ quyết định cũ nhưng không yêu cầu giá trị mới", () => {
    const payload = normalizeInvoicePayload({
        maLoaiHoaDon: "QuocPhong",
        loaiHinhDoanhThu: "QuocPhongNhomII",
        maLoaiTien: "VND",
        tyGia: 1,
        thongTinHoaDon: "HĐ 01",
        thongTinDonHang: "ĐH 01",
        loaiNguoiMua: "DoanhNghiep",
        chiTiet: [],
        quocPhong: {
            quyetDinhGiaoNhiemVu: "Dữ liệu lịch sử",
            nguonNganSach: "",
        },
    }, { id: 1, idDonVi: 2 });

    assert.equal(payload.thongTinHoaDon, "HĐ 01");
    assert.equal(payload.thongTinDonHang, "ĐH 01");
    assert.equal(payload.quocPhong.quyetDinhGiaoNhiemVu, "Dữ liệu lịch sử");
});

test("hóa đơn một thuế suất tính thuế từ tổng tiền hàng", () => {
    const lines = [
        { soLuong: 3, donGia: 10.005, tyLeChietKhau: 0, thueSuatGTGT: 5 },
        { soLuong: 2, donGia: 20.005, tyLeChietKhau: 0, thueSuatGTGT: 10 },
    ];

    const totals = calculateTotals(lines, 1, "MotThueSuat", 8);

    assert.equal(totals.tongTienHang, 70.025);
    assert.equal(totals.tongTienThue, 5.602);
    assert.equal(totals.tongTienThanhToan, 75.627);
});

test("hóa đơn nhiều thuế suất vẫn cộng tiền thuế từng dòng", () => {
    const lines = [
        { soLuong: 1, donGia: 100, tyLeChietKhau: 0, thueSuatGTGT: 5 },
        { soLuong: 1, donGia: 200, tyLeChietKhau: 0, thueSuatGTGT: 10 },
    ];

    const totals = calculateTotals(lines, 1, "NhieuThueSuat");

    assert.equal(totals.tongTienHang, 300);
    assert.equal(totals.tongTienThue, 25);
    assert.equal(totals.tongTienThanhToan, 325);
});
