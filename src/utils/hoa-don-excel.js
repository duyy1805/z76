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

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : null;
}

function round4(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

function convertedTaxTotal(invoice, lines) {
    if (invoice.tongTienThueQuyDoi != null) return invoice.tongTienThueQuyDoi;
    if (invoice.cheDoThue === "MotThueSuat") {
        return round4(Number(invoice.tongTienThue || 0) * Number(invoice.tyGia || 1));
    }
    return round4(lines.reduce((total, line) => total + Number(line.TienThueQuyDoi || 0), 0));
}

export function buildUpdatedImportRows(invoices = []) {
    const rows = [];
    invoices.forEach((invoice, invoiceIndex) => {
        const lines = invoice?.chiTiet || [];
        const taxConverted = convertedTaxTotal(invoice, lines);
        lines.forEach((line, lineIndex) => {
            const firstLine = lineIndex === 0;
            rows.push({
                [UPDATED_IMPORT_HEADERS[0]]: firstLine ? invoiceIndex + 1 : null,
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
                [UPDATED_IMPORT_HEADERS[12]]: line.ThueSuatGTGT ?? null,
                [UPDATED_IMPORT_HEADERS[13]]: firstLine ? invoice.tongTienThue ?? null : null,
                [UPDATED_IMPORT_HEADERS[14]]: firstLine ? taxConverted : null,
                [UPDATED_IMPORT_HEADERS[15]]: line.MaHang || null,
                [UPDATED_IMPORT_HEADERS[16]]: line.TenHangHoaDichVu || null,
                [UPDATED_IMPORT_HEADERS[17]]: line.DonViTinh || null,
                [UPDATED_IMPORT_HEADERS[18]]: line.SoLuong ?? null,
                [UPDATED_IMPORT_HEADERS[19]]: line.DonGia ?? null,
                [UPDATED_IMPORT_HEADERS[20]]: line.ThanhTien ?? null,
                [UPDATED_IMPORT_HEADERS[21]]: line.ThanhTienQuyDoi ?? null,
            });
        });
    });
    return rows;
}
