import * as XLSX from "xlsx";

export const UPDATED_IMPORT_HEADERS = [
    "Số thứ tự hóa đơn (*)",
    "Ngày hóa đơn",
    "Thời hạn thanh toán",
    "Tên đơn vị mua hàng",
    "Địa chỉ",
    "Mã số thuế",
    "MĐVCQHNS",
    "Người mua hàng",
    "Email",
    "Hình thức thanh toán",
    "Loại tiền",
    "Tỷ giá",
    "Thuế suất GTGT (%)",
    "Tiền thuế GTGT",
    "Tiền thuế GTGT quy đổi",
    "Mã hàng",
    "Tên hàng hóa/dịch vụ (*)",
    "ĐVT",
    "Số lượng",
    "Đơn giá",
    "Thành tiền",
    "Thành tiền quy đổi",
];

export const USED_INVOICE_SUMMARY_HEADERS = [
    "Row Labels",
    "Ngày hóa đơn",
    "Số hóa đơn",
    "Tên khách hàng",
    "Sum of Thành tiền",
    "Sum of Thành tiền quy đổi",
    "Sum of Tiền thuế GTGT",
    "Sum of Tổng tiền TT quy đổi",
];

const UPDATED_IMPORT_DATE_HEADERS = [UPDATED_IMPORT_HEADERS[1], UPDATED_IMPORT_HEADERS[2]];
const UPDATED_IMPORT_DATE_COLUMNS = ["B", "C"];

export function toExcelDateSerial(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    if (utcDate.getUTCFullYear() !== year || utcDate.getUTCMonth() !== month - 1 || utcDate.getUTCDate() !== day) return null;
    return (utcDate.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
}

export function applyUpdatedImportDateFormats(worksheet, rows = []) {
    rows.forEach((row, rowIndex) => {
        UPDATED_IMPORT_DATE_HEADERS.forEach((header, dateIndex) => {
            const serial = toExcelDateSerial(row?.[header]);
            if (serial == null) return;
            worksheet[`${UPDATED_IMPORT_DATE_COLUMNS[dateIndex]}${rowIndex + 2}`] = {
                t: "n",
                v: serial,
                z: "dd/mm/yyyy",
            };
        });
    });
    return worksheet;
}

function safeExcelFileName(value) {
    return String(value || "nhom-import").replace(/[\\/:*?"<>|]+/g, "-").trim() || "nhom-import";
}

function summaryDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function optionalNumber(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function convertedGoodsTotal(invoice) {
    const savedTotal = optionalNumber(invoice?.tongTienHangQuyDoi);
    if (savedTotal != null) return savedTotal;
    const convertedLines = (invoice?.chiTiet || [])
        .map((line) => optionalNumber(line?.ThanhTienQuyDoi))
        .filter((value) => value != null);
    if (convertedLines.length) return convertedLines.reduce((total, value) => total + value, 0);
    if (String(invoice?.maLoaiTien || "VND").toUpperCase() === "VND") return optionalNumber(invoice?.tongTienHang);
    return null;
}

export function buildUsedInvoiceSummaryRows(invoices = []) {
    const normalized = invoices.map((invoice) => ({
        symbol: String(invoice?.kyHieuHoaDon || invoice?.kyHieuDuKien || ""),
        dateKey: String(invoice?.ngayHoaDon || "").slice(0, 10),
        dateLabel: summaryDate(invoice?.ngayHoaDon),
        invoiceNumber: invoice?.soHoaDon == null ? "" : String(invoice.soHoaDon),
        customerName: invoice?.tenNguoiMua || "",
        goodsAmount: optionalNumber(invoice?.tongTienHang),
        convertedGoodsAmount: convertedGoodsTotal(invoice),
        taxAmount: optionalNumber(invoice?.tongTienThue),
        convertedTotal: optionalNumber(invoice?.tongThanhToanQuyDoi)
            ?? (String(invoice?.maLoaiTien || "VND").toUpperCase() === "VND" ? optionalNumber(invoice?.tongTienThanhToan) : null),
    })).sort((left, right) => (
        left.symbol.localeCompare(right.symbol, "vi")
        || left.dateKey.localeCompare(right.dateKey)
        || left.invoiceNumber.localeCompare(right.invoiceNumber, "vi", { numeric: true })
    ));

    let previousSymbol = null;
    let previousDate = null;
    const rows = normalized.map((invoice) => {
        const symbolChanged = invoice.symbol !== previousSymbol;
        const dateChanged = symbolChanged || invoice.dateKey !== previousDate;
        previousSymbol = invoice.symbol;
        previousDate = invoice.dateKey;
        return [
            symbolChanged ? invoice.symbol : null,
            dateChanged ? invoice.dateLabel : null,
            invoice.invoiceNumber,
            invoice.customerName,
            invoice.goodsAmount,
            invoice.convertedGoodsAmount,
            invoice.taxAmount,
            invoice.convertedTotal,
        ];
    });

    const totals = normalized.reduce((result, invoice) => {
        [invoice.goodsAmount, invoice.convertedGoodsAmount, invoice.taxAmount, invoice.convertedTotal].forEach((value, index) => {
            if (value != null) result[index] += value;
        });
        return result;
    }, [0, 0, 0, 0]);
    rows.push(["Grand Total", null, null, null, ...totals]);
    return rows;
}

function appendUsedInvoiceSummarySheet(workbook, invoices) {
    const summaryRows = buildUsedInvoiceSummaryRows(invoices);
    const worksheet = XLSX.utils.aoa_to_sheet([[], [], USED_INVOICE_SUMMARY_HEADERS, ...summaryRows]);
    worksheet["!cols"] = [
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 47 },
        { wch: 19 },
        { wch: 17 },
        { wch: 17 },
        { wch: 29 },
    ];
    const lastRow = summaryRows.length + 3;
    for (let row = 4; row <= lastRow; row += 1) {
        for (const column of ["E", "F", "G", "H"]) {
            const cell = worksheet[`${column}${row}`];
            if (cell) cell.z = "#,##0.00##";
        }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
}

export function writeUpdatedExcelFile(rows, fileBaseName = "nhom-import", invoices = []) {
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: UPDATED_IMPORT_HEADERS });
    applyUpdatedImportDateFormats(worksheet, rows);
    worksheet["!cols"] = UPDATED_IMPORT_HEADERS.map((header) => ({
        wch: Math.min(Math.max(header.length + 2, header.includes("Tên") || header === "Địa chỉ" ? 28 : 14), 42),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hóa đơn GTGT");
    appendUsedInvoiceSummarySheet(workbook, invoices);
    XLSX.writeFile(workbook, `${safeExcelFileName(fileBaseName)}-da-cap-nhat.xlsx`);
}

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : null;
}

function roundConvertedAmount(value) {
    return Math.round(Number(value || 0) + Number.EPSILON);
}

function roundCurrencyAmount(value, currency) {
    const fraction = String(currency || "VND").toUpperCase() === "VND" ? 0 : 3;
    const factor = 10 ** fraction;
    return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function convertedTaxTotal(invoice, lines) {
    if (invoice.tongTienThueQuyDoi != null) return roundConvertedAmount(invoice.tongTienThueQuyDoi);
    if (invoice.cheDoThue === "MotThueSuat") {
        return roundConvertedAmount(Number(invoice.tongTienThue || 0) * Number(invoice.tyGia || 1));
    }
    return roundConvertedAmount(lines.reduce((total, line) => total + Number(line.TienThueQuyDoi || 0), 0));
}

function displayVatRate(line) {
    const code = String(line.MaThueSuatGTGT ?? "").trim().toUpperCase();
    if (["KCT", "KKKNT", "KHAC"].includes(code)) return code;
    if (code && ["0", "5", "8", "10"].includes(code)) return Number(code);
    return line.ThueSuatGTGT ?? null;
}

export function buildUpdatedImportRows(invoices = []) {
    const rows = [];
    invoices.forEach((invoice, invoiceIndex) => {
        const lines = invoice?.chiTiet || [];
        const currency = invoice.maLoaiTien || "VND";
        const taxConverted = convertedTaxTotal(invoice, lines);
        lines.forEach((line, lineIndex) => {
            const firstLine = lineIndex === 0;
            rows.push({
                [UPDATED_IMPORT_HEADERS[0]]: invoiceIndex + 1,
                [UPDATED_IMPORT_HEADERS[1]]: firstLine ? dateOnly(invoice.ngayHoaDon) : null,
                [UPDATED_IMPORT_HEADERS[2]]: firstLine ? dateOnly(invoice.hanThanhToan) : null,
                [UPDATED_IMPORT_HEADERS[3]]: firstLine ? invoice.tenNguoiMua || null : null,
                [UPDATED_IMPORT_HEADERS[4]]: firstLine ? invoice.diaChi || null : null,
                [UPDATED_IMPORT_HEADERS[5]]: firstLine ? invoice.maSoThue || null : null,
                [UPDATED_IMPORT_HEADERS[6]]: firstLine ? invoice.maDvcqhns || null : null,
                [UPDATED_IMPORT_HEADERS[7]]: firstLine ? invoice.nguoiLienHe || null : null,
                [UPDATED_IMPORT_HEADERS[8]]: firstLine ? invoice.email || null : null,
                [UPDATED_IMPORT_HEADERS[9]]: firstLine ? invoice.hinhThucThanhToan || null : null,
                [UPDATED_IMPORT_HEADERS[10]]: firstLine ? invoice.maLoaiTien || "VND" : null,
                [UPDATED_IMPORT_HEADERS[11]]: firstLine ? Number(invoice.tyGia || 1) : null,
                [UPDATED_IMPORT_HEADERS[12]]: displayVatRate(line),
                [UPDATED_IMPORT_HEADERS[13]]: firstLine && invoice.tongTienThue != null ? roundCurrencyAmount(invoice.tongTienThue, currency) : null,
                [UPDATED_IMPORT_HEADERS[14]]: firstLine ? taxConverted : null,
                [UPDATED_IMPORT_HEADERS[15]]: line.MaHang || null,
                [UPDATED_IMPORT_HEADERS[16]]: line.TenHangHoaDichVu || null,
                [UPDATED_IMPORT_HEADERS[17]]: line.DonViTinh || null,
                [UPDATED_IMPORT_HEADERS[18]]: line.SoLuong ?? null,
                [UPDATED_IMPORT_HEADERS[19]]: line.DonGia ?? null,
                [UPDATED_IMPORT_HEADERS[20]]: line.ThanhTien == null ? null : roundCurrencyAmount(line.ThanhTien, currency),
                [UPDATED_IMPORT_HEADERS[21]]: line.ThanhTienQuyDoi == null ? null : roundConvertedAmount(line.ThanhTienQuyDoi),
            });
        });
    });
    return rows;
}
