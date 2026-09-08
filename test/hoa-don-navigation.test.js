import test from "node:test";
import assert from "node:assert/strict";
import {
    INVOICE_LIST_PATH,
    invoiceReturnLabel,
    readInvoiceListSearch,
    safeInvoiceReturnTo,
    updateInvoiceListSearch,
    withInvoiceReturnTo,
} from "../src/utils/hoa-don-navigation.js";

test("đọc tab và toàn bộ bộ lọc hóa đơn từ query string", () => {
    const state = readInvoiceListSearch("?tab=groups&q=abc&status=KhoiTao&type=XuatKhau&from=2026-01-01&to=2026-01-31&registration=HD-1&buyer=Z76&creator=Duy&amountFrom=10&amountTo=20&groupQ=NI-1&groupCreator=Duy&groupStatus=processing&groupFrom=2026-02-01&groupTo=2026-02-28");

    assert.equal(state.activeTab, 1);
    assert.deepEqual(state.filters, {
        tukhoa: "abc",
        maTrangThai: "KhoiTao",
        maLoaiHoaDon: "XuatKhau",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
    });
    assert.deepEqual(state.tableFilters, {
        maDangKy: "HD-1",
        nguoiMua: "Z76",
        nguoiTao: "Duy",
        amountFrom: "10",
        amountTo: "20",
    });
    assert.deepEqual(state.groupFilters, {
        keyword: "NI-1",
        creator: "Duy",
        status: "processing",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
    });
});

test("xóa giá trị mặc định khỏi URL nhưng giữ các bộ lọc còn lại", () => {
    const next = updateInvoiceListSearch("?tab=groups&q=abc&status=KhoiTao", {
        tab: "invoices",
        q: "ignored",
        tukhoa: "",
    });

    assert.equal(next.toString(), "status=KhoiTao");
});

test("returnTo chỉ cho phép đường dẫn nội bộ của phân hệ hóa đơn", () => {
    assert.equal(
        safeInvoiceReturnTo("/hoa-don-dien-tu?tab=groups&q=A"),
        "/hoa-don-dien-tu?tab=groups&q=A"
    );
    assert.equal(safeInvoiceReturnTo("https://evil.example/hoa-don-dien-tu"), INVOICE_LIST_PATH);
    assert.equal(safeInvoiceReturnTo("//evil.example/hoa-don-dien-tu"), INVOICE_LIST_PATH);
    assert.equal(safeInvoiceReturnTo("/hoa-don-dien-tu-khac"), INVOICE_LIST_PATH);
});

test("gắn returnTo và nhận diện nhãn quay lại theo ngữ cảnh", () => {
    const groupPath = withInvoiceReturnTo(
        "/hoa-don-dien-tu/nhom-import/12",
        "/hoa-don-dien-tu?tab=groups"
    );
    const detailPath = withInvoiceReturnTo("/hoa-don-dien-tu/34", groupPath);

    assert.equal(groupPath, "/hoa-don-dien-tu/nhom-import/12?returnTo=%2Fhoa-don-dien-tu%3Ftab%3Dgroups");
    assert.equal(invoiceReturnLabel(new URL(detailPath, "https://z76.local").searchParams.get("returnTo")), "Quay lại nhóm");
    assert.equal(invoiceReturnLabel("/hoa-don-dien-tu/34?returnTo=x"), "Quay lại chi tiết");
    assert.equal(withInvoiceReturnTo("/hoa-don-dien-tu/34", null), "/hoa-don-dien-tu/34");
});
