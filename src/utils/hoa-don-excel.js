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

export const USED_INVOICE_DETAIL_HEADERS = [
    "STT",
    "Ký hiệu",
    "Số hóa đơn",
    "Ngày hóa đơn",
    "Mã khách hàng",
    "Tên khách hàng",
    "Địa chỉ",
    "MST/CCCD chủ hộ",
    "Người mua hàng",
    "Hình thức TT",
    "Loại tiền",
    "Tỷ giá",
    "Mã hàng",
    "Tên hàng",
    "Số khung",
    "Số máy",
    "Số lô",
    "Hạn sử dụng",
    "ĐVT",
    "Số lượng",
    "Đơn giá",
    "Thành tiền",
    "Thành tiền quy đổi",
    "Tỷ lệ CK (%)",
    "Tiền CK",
    "Tiền chiết khấu quy đổi",
    "Thuế suất (%)",
    "Tiền thuế GTGT",
    "Tiền thuế GTGT quy đổi",
    "Tổng tiền TT",
    "Tổng tiền TT quy đổi",
    "Hàng KM",
    "Trạng thái HĐ",
    "Người lập HĐ",
];

const INVOICE_STATUS_LABELS = {
    KhoiTao: "Nháp",
    TraLai_HoaDon: "Trả lại",
    ChoDuyet_TBP: "Chờ TBP duyệt",
    ChoXuLy_HoaDon: "Chờ phụ trách hóa đơn",
    SanSangXuat: "Sẵn sàng xuất",
    DaXuat: "Đã xuất",
    HoanThanh: "Hoàn thành",
    TuChoi: "Từ chối",
};

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

function invoiceSymbol(invoice) {
    return String(invoice?.kyHieuHoaDon || invoice?.kyHieuDuKien || "");
}

function compareUsedInvoices(left, right) {
    return invoiceSymbol(left).localeCompare(invoiceSymbol(right), "vi")
        || String(left?.ngayHoaDon || "").slice(0, 10).localeCompare(String(right?.ngayHoaDon || "").slice(0, 10))
        || String(left?.soHoaDon || "").localeCompare(String(right?.soHoaDon || ""), "vi", { numeric: true });
}

export function buildUsedInvoiceSummaryRows(invoices = []) {
    const normalized = invoices.map((invoice) => ({
        symbol: invoiceSymbol(invoice),
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

function lineTaxAmount(invoice, line) {
    const savedTax = optionalNumber(line?.TienThueGTGT);
    if (savedTax != null) return savedTax;
    const amount = optionalNumber(line?.ThanhTien);
    const rate = optionalNumber(line?.ThueSuatGTGT);
    if (amount == null || rate == null) return null;
    return roundCurrencyAmount(amount * rate / 100, invoice?.maLoaiTien || "VND");
}

function lineConvertedTax(invoice, line, taxAmount) {
    const savedTax = optionalNumber(line?.TienThueQuyDoi);
    if (savedTax != null) return savedTax;
    if (taxAmount == null) return null;
    return roundConvertedAmount(taxAmount * Number(invoice?.tyGia || 1));
}

function promotionValue(line) {
    const value = String(line?.TinhChatHHDV || "").trim();
    if (!value) return null;
    return /khuy[eế]n\s*m[aạ]i|h[aà]ng\s*km/i.test(value) ? "x" : value;
}

function invoiceStatusLabel(invoice) {
    return invoice?.tenTrangThai || INVOICE_STATUS_LABELS[invoice?.maTrangThai] || invoice?.maTrangThai || "";
}

export function buildUsedInvoiceDetailRows(invoices = []) {
    const rows = [];
    [...invoices].sort(compareUsedInvoices).forEach((invoice) => {
        const currency = String(invoice?.maLoaiTien || "VND").toUpperCase();
        const exchangeRate = optionalNumber(invoice?.tyGia) ?? 1;
        const lines = invoice?.chiTiet || [];
        lines.forEach((line) => {
            const amount = optionalNumber(line?.ThanhTien);
            const convertedAmount = optionalNumber(line?.ThanhTienQuyDoi)
                ?? (amount == null ? null : roundConvertedAmount(amount * exchangeRate));
            const discount = optionalNumber(line?.TienChietKhau);
            const convertedDiscount = discount == null ? null : roundConvertedAmount(discount * exchangeRate);
            const taxAmount = lineTaxAmount(invoice, line);
            const convertedTax = lineConvertedTax(invoice, line, taxAmount);
            const taxCode = String(line?.MaThueSuatGTGT ?? "").trim().toUpperCase();
            const numericTaxRate = optionalNumber(line?.ThueSuatGTGT);

            rows.push([
                rows.length + 1,
                invoiceSymbol(invoice),
                invoice?.soHoaDon == null ? "" : String(invoice.soHoaDon),
                String(invoice?.ngayHoaDon || "").slice(0, 10),
                invoice?.maKhachHang || "",
                invoice?.tenNguoiMua || "",
                invoice?.diaChi || "",
                invoice?.maSoThue || invoice?.soGiayTo || "",
                invoice?.nguoiLienHe || "",
                invoice?.hinhThucThanhToan || "",
                currency,
                exchangeRate,
                line?.MaHang || "",
                line?.TenHangHoaDichVu || "",
                "",
                "",
                "",
                "",
                line?.DonViTinh || "",
                optionalNumber(line?.SoLuong),
                optionalNumber(line?.DonGia),
                amount,
                convertedAmount,
                optionalNumber(line?.TyLeChietKhau),
                discount,
                convertedDiscount,
                taxCode && !/^\d+(?:\.\d+)?$/.test(taxCode) ? taxCode : (numericTaxRate == null ? null : numericTaxRate / 100),
                taxAmount,
                convertedTax,
                amount == null && taxAmount == null ? null : Number(amount || 0) + Number(taxAmount || 0),
                convertedAmount == null && convertedTax == null ? null : Number(convertedAmount || 0) + Number(convertedTax || 0),
                promotionValue(line),
                invoiceStatusLabel(invoice),
                invoice?.tenNguoiDangKy || invoice?.nguoiDangKyId || "",
            ]);
        });
    });
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

function appendUsedInvoiceSymbolSummarySheet(workbook, invoices) {
    const totalsBySymbol = new Map();
    invoices.forEach((invoice) => {
        const symbol = invoiceSymbol(invoice);
        const totals = totalsBySymbol.get(symbol) || [0, 0];
        totals[0] += convertedGoodsTotal(invoice) || 0;
        totals[1] += optionalNumber(invoice?.tongTienThueQuyDoi)
            ?? (String(invoice?.maLoaiTien || "VND").toUpperCase() === "VND" ? optionalNumber(invoice?.tongTienThue) || 0 : 0);
        totalsBySymbol.set(symbol, totals);
    });
    const rows = [...totalsBySymbol.entries()]
        .sort(([left], [right]) => left.localeCompare(right, "vi"))
        .map(([symbol, totals]) => [symbol, ...totals]);
    const grandTotal = rows.reduce((result, row) => [result[0] + row[1], result[1] + row[2]], [0, 0]);
    const worksheet = XLSX.utils.aoa_to_sheet([
        [],
        [],
        ["Row Labels", "Sum of Thành tiền quy đổi", "Sum of Tiền thuế GTGT"],
        ...rows,
        ["Grand Total", ...grandTotal],
    ]);
    worksheet["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 23 }];
    for (let row = 4; row <= rows.length + 4; row += 1) {
        for (const column of ["B", "C"]) {
            if (worksheet[`${column}${row}`]) worksheet[`${column}${row}`].z = "#,##0";
        }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet3");
}

function sumDetailColumn(rows, index) {
    return rows.reduce((total, row) => total + (optionalNumber(row[index]) || 0), 0);
}

function reportPeriodLabel(invoices) {
    const dates = invoices.map((invoice) => String(invoice?.ngayHoaDon || "").slice(0, 10)).filter(Boolean).sort();
    if (!dates.length) return "Theo các hóa đơn được chọn";
    return `Từ ngày ${summaryDate(dates[0])} đến ngày ${summaryDate(dates[dates.length - 1])}`;
}

function appendUsedInvoiceDetailSheet(workbook, invoices) {
    const detailRows = buildUsedInvoiceDetailRows(invoices);
    const totalRow = Array(USED_INVOICE_DETAIL_HEADERS.length).fill(null);
    totalRow[0] = "Tổng cộng";
    [19, 21, 22, 24, 25, 27, 28, 29, 30].forEach((index) => {
        totalRow[index] = sumDetailColumn(detailRows, index);
    });
    const rows = [
        [],
        ["BẢNG KÊ CHI TIẾT HOÁ ĐƠN ĐÃ SỬ DỤNG"],
        [reportPeriodLabel(invoices)],
        [],
        USED_INVOICE_DETAIL_HEADERS,
        ...detailRows,
        totalRow,
        [],
        [],
        [null, "Người lập biểu", null, null, null, null, null, null, null, null, null, "Giám đốc"],
        [null, "(Ký, họ tên)", null, null, null, null, null, null, null, null, null, "(Ký, họ tên, đóng dấu)"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const lastDataRow = detailRows.length + 5;
    const totalExcelRow = lastDataRow + 1;
    worksheet["!merges"] = [
        XLSX.utils.decode_range("A2:AH2"),
        XLSX.utils.decode_range("A3:AH3"),
        XLSX.utils.decode_range(`B${totalExcelRow + 3}:C${totalExcelRow + 3}`),
        XLSX.utils.decode_range(`L${totalExcelRow + 3}:M${totalExcelRow + 3}`),
        XLSX.utils.decode_range(`B${totalExcelRow + 4}:C${totalExcelRow + 4}`),
        XLSX.utils.decode_range(`L${totalExcelRow + 4}:M${totalExcelRow + 4}`),
    ];
    worksheet["!autofilter"] = { ref: `A5:AH${Math.max(lastDataRow, 5)}` };
    worksheet["!cols"] = [
        6, 11, 15, 14, 10, 28, 42, 20, 20, 18, 11, 13, 16, 38, 14, 14, 14, 14,
        11, 14, 16, 18, 20, 14, 16, 23, 15, 18, 23, 18, 23, 11, 18, 22,
    ].map((wch) => ({ wch }));
    worksheet["!rows"] = [{ hpt: 20 }, { hpt: 24 }, { hpt: 22 }, { hpt: 8 }, { hpt: 48 }];

    for (let index = 0; index < detailRows.length; index += 1) {
        const excelRow = index + 6;
        const serial = toExcelDateSerial(detailRows[index][3]);
        if (serial != null) worksheet[`D${excelRow}`] = { t: "n", v: serial, z: "dd/mm/yyyy" };
        for (const column of ["T", "U", "V", "X", "Y", "Z", "AB", "AD"]) {
            if (worksheet[`${column}${excelRow}`]) worksheet[`${column}${excelRow}`].z = "#,##0.####";
        }
        for (const column of ["W", "AC", "AE"]) {
            if (worksheet[`${column}${excelRow}`]) worksheet[`${column}${excelRow}`].z = "#,##0";
        }
        if (worksheet[`L${excelRow}`]) worksheet[`L${excelRow}`].z = "#,##0.####";
        if (worksheet[`AA${excelRow}`]?.t === "n") worksheet[`AA${excelRow}`].z = "0.##%";
    }
    for (const column of ["T", "V", "W", "Y", "Z", "AB", "AC", "AD", "AE"]) {
        if (worksheet[`${column}${totalExcelRow}`]) worksheet[`${column}${totalExcelRow}`].z = "#,##0.####";
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng kê chi tiết HĐ đã sử dụng");
}

export function buildUsedInvoiceReportWorkbook(invoices = []) {
    const workbook = XLSX.utils.book_new();
    appendUsedInvoiceSummarySheet(workbook, invoices);
    appendUsedInvoiceSymbolSummarySheet(workbook, invoices);
    appendUsedInvoiceDetailSheet(workbook, invoices);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Sheet2");
    return workbook;
}

export function writeUsedInvoiceReport(invoices = [], fileBaseName = "bao-cao-hoa-don-da-su-dung") {
    const workbook = buildUsedInvoiceReportWorkbook(invoices);
    XLSX.writeFile(workbook, `${safeExcelFileName(fileBaseName)}.xlsx`);
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
