export const INVOICE_LIST_PATH = "/hoa-don-dien-tu";

const LIST_PARAM_BY_KEY = {
    tukhoa: "q",
    maTrangThai: "status",
    maLoaiHoaDon: "type",
    dateFrom: "from",
    dateTo: "to",
    maDangKy: "registration",
    nguoiMua: "buyer",
    nguoiTao: "creator",
    amountFrom: "amountFrom",
    amountTo: "amountTo",
    groupKeyword: "groupQ",
    groupCreator: "groupCreator",
    groupStatus: "groupStatus",
    groupDateFrom: "groupFrom",
    groupDateTo: "groupTo",
};

function asSearchParams(value) {
    if (value instanceof URLSearchParams) return value;
    return new URLSearchParams(String(value || "").replace(/^\?/, ""));
}

export function readInvoiceListSearch(value) {
    const searchParams = asSearchParams(value);
    const read = (key) => searchParams.get(LIST_PARAM_BY_KEY[key]) || "";
    return {
        activeTab: searchParams.get("tab") === "groups" ? 1 : 0,
        filters: {
            tukhoa: read("tukhoa"),
            maTrangThai: read("maTrangThai"),
            maLoaiHoaDon: read("maLoaiHoaDon"),
            dateFrom: read("dateFrom"),
            dateTo: read("dateTo"),
        },
        tableFilters: {
            maDangKy: read("maDangKy"),
            nguoiMua: read("nguoiMua"),
            nguoiTao: read("nguoiTao"),
            amountFrom: read("amountFrom"),
            amountTo: read("amountTo"),
        },
        groupFilters: {
            keyword: read("groupKeyword"),
            creator: read("groupCreator"),
            status: read("groupStatus"),
            dateFrom: read("groupDateFrom"),
            dateTo: read("groupDateTo"),
        },
    };
}

export function updateInvoiceListSearch(value, patch = {}) {
    const searchParams = new URLSearchParams(asSearchParams(value));
    Object.entries(patch).forEach(([key, rawValue]) => {
        if (key === "tab") {
            if (rawValue === "groups" || rawValue === 1) searchParams.set("tab", "groups");
            else searchParams.delete("tab");
            return;
        }
        const paramName = LIST_PARAM_BY_KEY[key];
        if (!paramName) return;
        const nextValue = String(rawValue ?? "");
        if (nextValue) searchParams.set(paramName, nextValue);
        else searchParams.delete(paramName);
    });
    return searchParams;
}

export function currentInvoicePath(location) {
    return `${location?.pathname || INVOICE_LIST_PATH}${location?.search || ""}`;
}

export function withInvoiceReturnTo(target, returnTo) {
    const [pathAndSearch, hash = ""] = String(target || INVOICE_LIST_PATH).split("#", 2);
    const [pathname, search = ""] = pathAndSearch.split("?", 2);
    const searchParams = new URLSearchParams(search);
    const safeReturnTo = safeInvoiceReturnTo(returnTo, "");
    if (safeReturnTo) searchParams.set("returnTo", safeReturnTo);
    else searchParams.delete("returnTo");
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

export function safeInvoiceReturnTo(value, fallback = INVOICE_LIST_PATH) {
    const fallbackValue = typeof fallback === "string" ? fallback : INVOICE_LIST_PATH;
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
        return fallbackValue;
    }
    try {
        const base = "https://z76.local";
        const parsed = new URL(value, base);
        const isInvoicePath = parsed.pathname === INVOICE_LIST_PATH || parsed.pathname.startsWith(`${INVOICE_LIST_PATH}/`);
        if (parsed.origin !== base || !isInvoicePath) return fallbackValue;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return fallbackValue;
    }
}

export function invoiceReturnLabel(returnTo) {
    const pathname = safeInvoiceReturnTo(returnTo).split(/[?#]/, 1)[0];
    if (pathname.includes("/nhom-import/")) return "Quay lại nhóm";
    if (/^\/hoa-don-dien-tu\/\d+(?:\/edit)?$/.test(pathname)) return "Quay lại chi tiết";
    return "Danh sách hóa đơn";
}
