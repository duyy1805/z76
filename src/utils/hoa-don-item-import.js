import * as XLSX from "xlsx";
import { currencyUnitPriceScale, emptyInvoiceLine, INVOICE_NUMBER_FORMAT, VAT_RATE_OPTIONS, vatRateValue } from "./hoa-don.js";

export const ITEM_IMPORT_HEADERS = ["Mã hàng", "Tên hàng hóa/dịch vụ (*)", "ĐVT", "Số lượng", "Đơn giá", "Thuế suất GTGT (%)"];

export function downloadInvoiceItemTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
        ITEM_IMPORT_HEADERS,
        ["SP001", "Tên hàng hóa mẫu", "Cái", 10, 125000, 8],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 48 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];
    ws["!autofilter"] = { ref: "A1:F2" };
    ws["D2"].z = "#,##0.00";
    ws["E2"].z = "#,##0.00000";
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, ws, "Hang hoa dich vu");
    XLSX.writeFile(book, "mau-hang-hoa-dich-vu-hoa-don.xlsx");
}

function numberFromCell(value, label, row, maxDecimals) {
    if (value === "" || value === null || value === undefined) throw new Error(`Dòng ${row}: thiếu ${label}.`);
    const text = String(value).trim();
    // Excel lưu ô số dưới dạng number; với ô text, chỉ nhận dấu chấm thập phân.
    const number = typeof value === "number" ? value : Number(text);
    if (!Number.isFinite(number) || number < 0 || !/^\d+(?:\.\d+)?$/.test(text)) {
        throw new Error(`Dòng ${row}: ${label} phải là số không âm (ô số Excel hoặc dấu chấm thập phân).`);
    }
    if (Math.abs(number - Math.round(number * (10 ** maxDecimals)) / (10 ** maxDecimals)) > 1e-8) {
        throw new Error(`Dòng ${row}: ${label} chỉ được tối đa ${maxDecimals} chữ số thập phân.`);
    }
    return number;
}

export function parseInvoiceItemWorkbook(buffer, { currency = "VND", multipleTaxRates = false } = {}) {
    const book = XLSX.read(buffer, { type: "array" });
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error("File Excel không có trang tính dữ liệu.");
    // Giữ dòng trống để vị trí báo lỗi khớp với số dòng trong Excel.
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
    const headers = (rows[0] || []).map((v) => String(v).trim());
    if (ITEM_IMPORT_HEADERS.some((header, i) => headers[i] !== header)) {
        throw new Error("Tiêu đề các cột không khớp file mẫu. Hãy tải và sử dụng file mẫu mới.");
    }
    const result = [];
    for (let i = 1; i < rows.length; i += 1) {
        const cells = rows[i];
        if (cells.every((value) => String(value ?? "").trim() === "")) continue;
        const excelRow = i + 1;
        const name = String(cells[1] ?? "").trim();
        if (!name) throw new Error(`Dòng ${excelRow}: thiếu Tên hàng hóa/dịch vụ.`);
        if (name.length > 1000) throw new Error(`Dòng ${excelRow}: tên hàng vượt quá 1000 ký tự.`);
        const code = String(cells[0] ?? "").trim();
        const unit = String(cells[2] ?? "").trim();
        if (code.length > 100 || unit.length > 100) throw new Error(`Dòng ${excelRow}: Mã hàng hoặc ĐVT vượt quá 100 ký tự.`);
        const quantity = numberFromCell(cells[3], "Số lượng", excelRow, INVOICE_NUMBER_FORMAT.quantity);
        const price = numberFromCell(cells[4], "Đơn giá", excelRow, currencyUnitPriceScale(currency));
        const tax = String(cells[5] ?? "").trim().replace(/%$/, "").trim().toUpperCase();
        if (multipleTaxRates && !VAT_RATE_OPTIONS.some((rate) => rate.value === tax)) {
            throw new Error(`Dòng ${excelRow}: thuế suất không hợp lệ. Dùng 0, 5, 8, 10, KCT, KKKNT hoặc KHAC.`);
        }
        result.push({
            ...emptyInvoiceLine(result.length + 1),
            maHang: code,
            tenHangHoaDichVu: name,
            donViTinh: unit,
            soLuong: quantity,
            donGia: price,
            tyLeChietKhau: 0,
            maThueSuatGTGT: multipleTaxRates ? tax : "",
            thueSuatGTGT: multipleTaxRates ? vatRateValue(tax) : "",
        });
    }
    if (!result.length) throw new Error("File Excel không có hàng hóa để nhập.");
    return result;
}
