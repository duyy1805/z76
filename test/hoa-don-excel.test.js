import test from "node:test";
import assert from "node:assert/strict";
import { buildUpdatedImportRows, UPDATED_IMPORT_HEADERS } from "../src/utils/hoa-don-excel.js";

test("tạo dữ liệu Excel 22 cột từ thông tin hóa đơn mới nhất", () => {
    const rows = buildUpdatedImportRows([{
        ngayHoaDon: "2026-09-07T00:00:00.000Z",
        hanThanhToan: "2026-09-30T00:00:00.000Z",
        tenNguoiMua: "Đơn vị A",
        diaChi: "Hà Nội",
        maSoThue: "0101",
        nguoiLienHe: "Nguyễn A",
        email: "a@example.com",
        hinhThucThanhToan: "Chuyển khoản",
        maLoaiTien: "VND",
        tyGia: 1,
        tongTienThue: 8,
        tongTienThueQuyDoi: 8,
        chiTiet: [
            { MaHang: "A", TenHangHoaDichVu: "Hàng A", DonViTinh: "Cái", SoLuong: 1, DonGia: 100, ThueSuatGTGT: 8, ThanhTien: 100, ThanhTienQuyDoi: 100 },
            { MaHang: "B", TenHangHoaDichVu: "Hàng B", DonViTinh: "Cái", SoLuong: 2, DonGia: 50, ThueSuatGTGT: 8, ThanhTien: 100, ThanhTienQuyDoi: 100 },
        ],
    }]);

    assert.equal(UPDATED_IMPORT_HEADERS.length, 22);
    assert.equal(Object.keys(rows[0]).length, 22);
    assert.equal(rows[0]["Số thứ tự hóa đơn (*)"], 1);
    assert.equal(rows[0]["Thời hạn thanh toán"], "2026-09-30");
    assert.equal(rows[0]["Tiền thuế GTGT"], 8);
    assert.equal(rows[1]["Số thứ tự hóa đơn (*)"], null);
    assert.equal(rows[1]["Tiền thuế GTGT"], null);
    assert.equal(rows[1]["Tên hàng hóa/dịch vụ (*)"], "Hàng B");
});

test("tính thuế quy đổi theo chế độ thuế khi API không trả tổng riêng", () => {
    const rows = buildUpdatedImportRows([
        {
            cheDoThue: "MotThueSuat",
            tyGia: 25000,
            tongTienThue: 1.2345,
            chiTiet: [{ TenHangHoaDichVu: "Một thuế", TienThueQuyDoi: 1 }],
        },
        {
            cheDoThue: "NhieuThueSuat",
            tyGia: 25000,
            tongTienThue: 3,
            chiTiet: [
                { TenHangHoaDichVu: "Nhiều thuế 1", TienThueQuyDoi: 10.11111 },
                { TenHangHoaDichVu: "Nhiều thuế 2", TienThueQuyDoi: 20.22222 },
            ],
        },
    ]);

    assert.equal(rows[0]["Tiền thuế GTGT quy đổi"], 30862.5);
    assert.equal(rows[1]["Tiền thuế GTGT quy đổi"], 30.3333);
});
