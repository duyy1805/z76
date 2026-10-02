import test from "node:test";
import assert from "node:assert/strict";
import { PAYMENT_METHOD_OPTIONS } from "../src/utils/hoa-don.js";

test("danh sách hình thức thanh toán dùng chung có đủ lựa chọn nghiệp vụ", () => {
    assert.deepEqual(PAYMENT_METHOD_OPTIONS, [
        "Tiền mặt",
        "Chuyển khoản",
        "TM/CK",
        "Đối trừ công nợ",
        "Không thu tiền",
        "Thẻ quốc tế",
    ]);
});
