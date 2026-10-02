import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
    applyUpdatedImportDateFormats,
    buildUpdatedImportRows,
    UPDATED_IMPORT_HEADERS,
    toExcelDateSerial,
} from "../src/utils/hoa-don-excel.js";

test("chuyển ngày ISO thành giá trị ngày Excel và hiển thị dd/mm/yyyy", () => {
    const rows = buildUpdatedImportRows([{
        ngayHoaDon: "2026-10-01T00:00:00.000Z",
        hanThanhToan: "2026-11-30T00:00:00.000Z",
        chiTiet: [{ TenHangHoaDichVu: "Hàng hóa" }],
    }]);
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: UPDATED_IMPORT_HEADERS });

    applyUpdatedImportDateFormats(worksheet, rows);

    assert.deepEqual(worksheet.B2, { t: "n", v: toExcelDateSerial("2026-10-01"), z: "dd/mm/yyyy" });
    assert.deepEqual(worksheet.C2, { t: "n", v: toExcelDateSerial("2026-11-30"), z: "dd/mm/yyyy" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hóa đơn GTGT");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const savedWorkbook = XLSX.read(buffer, { type: "buffer", cellNF: true });
    const savedSheet = savedWorkbook.Sheets["Hóa đơn GTGT"];

    assert.equal(savedSheet.B2.t, "n");
    assert.equal(savedSheet.B2.z, "dd/mm/yyyy");
    assert.equal(savedSheet.B2.w, "01/10/2026");
    assert.equal(savedSheet.C2.w, "30/11/2026");
});

test("không biến giá trị rỗng hoặc ngày không hợp lệ thành ngày Excel", () => {
    assert.equal(toExcelDateSerial(null), null);
    assert.equal(toExcelDateSerial("2026-02-30"), null);
    assert.equal(toExcelDateSerial("không phải ngày"), null);
});
