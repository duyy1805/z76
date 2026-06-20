export const EXPENSE_LABELS = {
    TienDien: "Tiền điện",
    TienGiaCong: "Tiền gia công",
    Khac: "Khác",
};

export const PAYMENT_CONTENT_MAX_LENGTH = 146;
export const PAYMENT_CONTENT_FORBIDDEN_CHARS = /['"@%$^{}()<>?|\\[\]/]/;
export const PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT = "' \" @ % $ ^ { } ( ) < > ? | \\ [ ] /";

export const ACTION_BUTTON_SIZE = 40;
export const ACTION_BUTTON_COUNT = 4;
export const ACTION_COLUMN_WIDTH = ACTION_BUTTON_SIZE * ACTION_BUTTON_COUNT + 16;

export const stickyActionCellSx = {
    position: { xs: "static", md: "sticky" },
    right: { md: 0 },
    width: ACTION_COLUMN_WIDTH,
    minWidth: ACTION_COLUMN_WIDTH,
    maxWidth: ACTION_COLUMN_WIDTH,
    px: 1,
    boxSizing: "border-box",
    bgcolor: "background.paper",
    zIndex: { xs: "auto", md: 2 },
    boxShadow: { xs: "none", md: (theme) => `-1px 0 0 ${theme.palette.divider}` },
};

export const stickyStatusCellSx = {
    position: { xs: "static", md: "sticky" },
    right: { md: ACTION_COLUMN_WIDTH },
    minWidth: 145,
    bgcolor: "background.paper",
    zIndex: { xs: "auto", md: 2 },
};

export const DEFAULT_STATUS_ORDER = [
    "KhoiTao",
    "ChoDuyet_TBP",
    "ChoDuyet_KTT",
    "ChoDuyet_GD",
    "HoanThanh",
    "TuChoi",
];

export const STATUS_FILTER_OPTIONS = [
    { value: "KhoiTao", label: "Nháp" },
    { value: "ChoDuyet_TBP", label: "Chờ duyệt TBP" },
    { value: "ChoDuyet_KTT", label: "Chờ duyệt KTT" },
    { value: "ChoDuyet_GD", label: "Chờ duyệt Giám đốc" },
    { value: "TuChoi", label: "Từ chối" },
    { value: "HoanThanh_ChuaCoLenhChi", label: "Chưa có lệnh chi" },
    { value: "HoanThanh_DaCoLenhChi", label: "Có lệnh chi" },
];

export const STATUS_ORDER_BY_ROLE = {
    TBP: ["ChoDuyet_TBP", "ChoDuyet_KTT", "ChoDuyet_GD", "KhoiTao", "HoanThanh", "TuChoi"],
    KTT: ["ChoDuyet_KTT", "ChoDuyet_GD", "ChoDuyet_TBP", "KhoiTao", "HoanThanh", "TuChoi"],
    GD: ["ChoDuyet_GD", "ChoDuyet_KTT", "ChoDuyet_TBP", "KhoiTao", "HoanThanh", "TuChoi"],
    Admin: ["KhoiTao", "ChoDuyet_TBP", "ChoDuyet_KTT", "ChoDuyet_GD", "HoanThanh", "TuChoi"],
};

const VN_NUMBER_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const VN_NUMBER_UNITS = ["", "nghìn", "triệu", "tỷ"];

export const fmtMoney = (value) =>
    (value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function validatePaymentContent(value = "") {
    const content = String(value).trim();
    if (!content) return "Nhập nội dung";
    if (content.length > PAYMENT_CONTENT_MAX_LENGTH) {
        return `Nội dung thanh toán không quá ${PAYMENT_CONTENT_MAX_LENGTH} ký tự`;
    }
    if (PAYMENT_CONTENT_FORBIDDEN_CHARS.test(content)) {
        return `Nội dung thanh toán không được dùng các ký tự: ${PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT}`;
    }
    return "";
}

function capitalizeFirst(value = "") {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function readVietnameseTriple(value, forceFull = false) {
    const hundreds = Math.floor(value / 100);
    const tens = Math.floor((value % 100) / 10);
    const ones = value % 10;
    const parts = [];

    if (hundreds > 0) parts.push(`${VN_NUMBER_WORDS[hundreds]} trăm`);
    else if (forceFull && (tens > 0 || ones > 0)) parts.push("không trăm");

    if (tens > 1) parts.push(`${VN_NUMBER_WORDS[tens]} mươi`);
    else if (tens === 1) parts.push("mười");
    else if (ones > 0 && (hundreds > 0 || forceFull)) parts.push("lẻ");

    if (ones > 0) {
        if (ones === 1 && tens > 1) parts.push("mốt");
        else if (ones === 4 && tens > 1) parts.push("tư");
        else if (ones === 5 && tens >= 1) parts.push("lăm");
        else parts.push(VN_NUMBER_WORDS[ones]);
    }

    return parts.join(" ");
}

function readVietnameseInteger(value) {
    const number = Math.trunc(Math.abs(Number(value)));
    if (!Number.isFinite(number)) return "";
    if (number === 0) return VN_NUMBER_WORDS[0];

    const groups = [];
    let remaining = number;
    while (remaining > 0) {
        groups.unshift(remaining % 1000);
        remaining = Math.floor(remaining / 1000);
    }

    return groups
        .map((group, index) => {
            if (group === 0) return "";
            const unitIndex = (groups.length - index - 1) % VN_NUMBER_UNITS.length;
            const billionRepeat = Math.floor((groups.length - index - 1) / VN_NUMBER_UNITS.length);
            const unit = [VN_NUMBER_UNITS[unitIndex], ...Array(billionRepeat).fill("tỷ")].filter(Boolean).join(" ");
            return `${readVietnameseTriple(group, index > 0)} ${unit}`.trim();
        })
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

export function amountToVietnameseText(value, currencyCode = "VND") {
    if (value === "" || value == null || Number(value) <= 0) return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";

    const [integerText, decimalText = ""] = String(value).split(".");
    const integerWords = readVietnameseInteger(integerText);
    const fractionWords = decimalText.replace(/0+$/, "")
        ? ` phẩy ${decimalText.replace(/0+$/, "").split("").map((digit) => VN_NUMBER_WORDS[Number(digit)]).join(" ")}`
        : "";
    const suffix = currencyCode === "VND" ? "đồng" : currencyCode;

    return `${capitalizeFirst(integerWords)}${fractionWords} ${suffix}`.replace(/\s+/g, " ").trim();
}

export function isoToDisplay(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    const serverTime = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const pad = (part) => String(part).padStart(2, "0");
    return `${pad(serverTime.getDate())}/${pad(serverTime.getMonth() + 1)}/${serverTime.getFullYear()} ${pad(serverTime.getHours())}:${pad(serverTime.getMinutes())}`;
}

export const stripVN = (value = "") =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

export const isSameId = (left, right) =>
    left !== null &&
    left !== undefined &&
    right !== null &&
    right !== undefined &&
    String(left) === String(right);

export function getDisplayStatus(phieu) {
    if (phieu?.trangThai !== "HoanThanh") return phieu?.trangThai;
    return phieu?.maLenhChi ? "HoanThanh_DaCoLenhChi" : "HoanThanh_ChuaCoLenhChi";
}

export function getCompletedAt(phieu) {
    if (phieu?.trangThai !== "HoanThanh") return null;
    return phieu?.gdTime || phieu?.kttTime || null;
}

export const getStatusFilterLabel = (value) =>
    STATUS_FILTER_OPTIONS.find((option) => option.value === value)?.label || value;

export function hasSelectedText() {
    if (typeof window === "undefined") return false;
    return window.getSelection()?.toString().trim().length > 0;
}

export function hasPhieuPermission({ role, permissions = [] }, code) {
    return role === "Admin" ||
        permissions.includes("Admin") ||
        permissions.includes(code) ||
        role === code;
}

export function canApprovePhieu(phieu, auth) {
    return (phieu?.trangThai === "ChoDuyet_TBP" && hasPhieuPermission(auth, "TBP")) ||
        (phieu?.trangThai === "ChoDuyet_KTT" && hasPhieuPermission(auth, "KTT")) ||
        (phieu?.trangThai === "ChoDuyet_GD" && hasPhieuPermission(auth, "GD"));
}

export function canRejectPhieu(phieu, auth) {
    return canApprovePhieu(phieu, auth) ||
        (hasPhieuPermission(auth, "KTT") && phieu?.trangThai === "ChoDuyet_GD");
}

export function canReturnPhieu(phieu, auth) {
    const pendingLenhChi = phieu?.trangThai === "HoanThanh" && !phieu?.maLenhChi;
    return (hasPhieuPermission(auth, "KTT") && ["ChoDuyet_KTT", "ChoDuyet_GD"].includes(phieu?.trangThai)) ||
        (pendingLenhChi && (
            hasPhieuPermission(auth, "TaoLenhChi") ||
            hasPhieuPermission(auth, "KTT") ||
            hasPhieuPermission(auth, "Admin")
        ));
}

export function canEditPhieu(phieu, auth) {
    return phieu?.trangThai === "KhoiTao" &&
        (hasPhieuPermission(auth, "Admin") || Number(phieu?.nguoiDangKyId) === Number(auth.userId));
}

export const canSubmitPhieu = canEditPhieu;

export function canDeletePhieu(phieu, auth) {
    return !!phieu && (
        hasPhieuPermission(auth, "Admin") ||
        (
            Number(phieu?.nguoiDangKyId) === Number(auth.userId) &&
            ["KhoiTao", "TuChoi"].includes(phieu?.trangThai)
        )
    );
}
