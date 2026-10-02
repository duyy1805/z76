import test from "node:test";
import assert from "node:assert/strict";
import { formatInvoiceDateTime, invoiceDateTimeKey } from "../src/utils/hoa-don.js";

test("giữ nguyên giờ Việt Nam do SQL datetime trả về thay vì cộng thêm 7 giờ", () => {
    assert.equal(formatInvoiceDateTime("2026-10-02T20:39:00.000Z"), "20:39 02/10/2026");
    assert.equal(formatInvoiceDateTime("2026-10-01T22:53:00.000Z"), "22:53 01/10/2026");
});

test("lọc ngày import dùng ngày SQL gốc và không nhảy sang ngày hôm sau", () => {
    assert.equal(invoiceDateTimeKey("2026-10-01T22:53:00.000Z"), "2026-10-01");
    assert.equal(invoiceDateTimeKey("2026-10-02 20:39:00"), "2026-10-02");
});

test("giá trị thời gian không hợp lệ hiển thị an toàn", () => {
    assert.equal(formatInvoiceDateTime(null), "—");
    assert.equal(formatInvoiceDateTime("không hợp lệ"), "—");
    assert.equal(invoiceDateTimeKey("không hợp lệ"), "");
});
