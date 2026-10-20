export function buildRevenueTypeRows(byRevenueType = [], byDepartment = [], totalRevenueVnd = 0) {
    const departmentsByType = new Map();
    byDepartment.forEach((item) => {
        const key = String(item.revenueType || "ChuaPhanLoai");
        if (!departmentsByType.has(key)) departmentsByType.set(key, []);
        departmentsByType.get(key).push({ ...item });
    });

    departmentsByType.forEach((items) => {
        items.sort((left, right) => Number(right.revenueVnd || 0) - Number(left.revenueVnd || 0));
    });

    const denominator = Number(totalRevenueVnd || 0);
    return byRevenueType.map((item) => ({
        ...item,
        share: denominator > 0 ? Number(item.revenueVnd || 0) / denominator : 0,
        departments: departmentsByType.get(String(item.revenueType || "ChuaPhanLoai")) || [],
    }));
}

export function groupExportCustomers(rows = []) {
    const grouped = new Map();
    rows.forEach((item) => {
        const key = String(item.customerKey || item.customerName || "Chưa xác định");
        const current = grouped.get(key) || {
            customerKey: key,
            customerName: item.customerName || "Chưa xác định",
            taxCode: item.taxCode || null,
            invoiceCount: 0,
            revenueVnd: 0,
            missingConvertedCount: 0,
            currencies: [],
        };
        current.invoiceCount += Number(item.invoiceCount || 0);
        current.revenueVnd += Number(item.revenueVnd || 0);
        current.missingConvertedCount += Number(item.missingConvertedCount || 0);
        if (!current.taxCode && item.taxCode) current.taxCode = item.taxCode;
        current.currencies.push({
            currencyCode: item.currencyCode || "VND",
            invoiceCount: Number(item.invoiceCount || 0),
            originalAmount: Number(item.originalAmount || 0),
            revenueVnd: Number(item.revenueVnd || 0),
        });
        grouped.set(key, current);
    });

    return Array.from(grouped.values())
        .map((customer) => ({
            ...customer,
            currencies: customer.currencies.sort((left, right) => left.currencyCode.localeCompare(right.currencyCode)),
        }))
        .sort((left, right) => right.revenueVnd - left.revenueVnd || left.customerName.localeCompare(right.customerName, "vi"));
}
