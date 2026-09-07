import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotals } from "../src/utils/hoa-don.js";

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
