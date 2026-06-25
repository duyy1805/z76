import { useEffect, useState, useCallback } from "react";
import {
    Box, Paper, Typography, Stack, Button, TextField, Autocomplete, CircularProgress, Divider, MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

const fmtCompactMoney = (value) => {
    const n = Number(value || 0);
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
    return n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
};

const logSoSecDashboard = (...args) => console.log("[SoSec][Dashboard]", ...args);

export default function Dashboard() {
    const { user, role } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mode, setMode] = useState(() => searchParams.get("loaiSec") === "NgoaiTe" ? "NgoaiTe" : "VND");
    const isNgoaiTe = mode === "NgoaiTe";

    // ─── Filters ──────────────────────────────────────────────────────────────
    const [donvis, setDonvis] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [creatorDV, setCreatorDV] = useState(null);
    const [benefitDV, setBenefitDV] = useState(null);
    const [groupBy, setGroupBy] = useState("Month"); // Month|CreatorDonVi|DonViHuongThu
    const [currencies, setCurrencies] = useState([]);
    const [maLoaiTien, setMaLoaiTien] = useState("");

    // ─── Status cards (giữ như bạn có) ───────────────────────────────────────
    const [statCards, setStatCards] = useState({
        draft: 0, waitingTBP: 0, waitingExpenseReviewer: 0, waitingKTT: 0, waitingGD: 0, completed: 0, rejected: 0,
    });

    // ─── Summary & Grouped data ──────────────────────────────────────────────
    const [summary, setSummary] = useState({
        totalCount: 0, totalAmount: 0, byStatus: {}
    });
    const [grouped, setGrouped] = useState([]); // [{label, count, amount}]
    const [loading, setLoading] = useState(false);

    const buildCommonParams = () => ({
        userId: user?.id,
        roleCode: role,
        idDonVi: user?.idDonVi,
        dateFrom: fromDate ? dayjs(fromDate).format("YYYY-MM-DD") : "",
        dateTo: toDate ? dayjs(toDate).format("YYYY-MM-DD") : "",
        creatorDonViId: creatorDV?.id ?? "",
        donViHuongThuId: benefitDV?.id ?? "",
        loaiSec: mode,
        maLoaiTien: isNgoaiTe ? maLoaiTien : "VND",
    });

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const params = buildCommonParams();
            logSoSecDashboard("loadAll params", { params, user, role });

            // 1) Cards cũ (nếu bạn đang lấy từ /dashboard)
            const cards = await api.getDashboard(params);
            setStatCards(cards);

            // 2) Summary
            const sum = await api.getDashboardSummary(params);
            setSummary(sum);

            // 3) Grouped
            const grp = await api.getDashboardGrouped({ ...params, groupBy });
            setGrouped(grp);
            logSoSecDashboard("loadAll result", { cards, summary: sum, grouped: grp });
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, role, user?.idDonVi, fromDate, toDate, creatorDV?.id, benefitDV?.id, groupBy, mode, maLoaiTien]);

    useEffect(() => {
        (async () => {
            const [list, currencyRows] = await Promise.all([api.listDonVi(), api.listLoaiTien({ tontai: 1 })]);
            setDonvis(list || []);
            setCurrencies(currencyRows || []);
            await loadAll();
        })();
    }, [loadAll]);

    const clearFilters = async () => {
        setFromDate(null);
        setToDate(null);
        setCreatorDV(null);
        setBenefitDV(null);
        setMaLoaiTien("");
        await loadAll();
    };

    // Colors for pie (status)
    const STATUS_COLORS = {
        draft: "#607d8b",
        waitingTBP: "#fbc02d",
        waitingExpenseReviewer: "#12b76a",
        waitingKTT: "#fdd835",
        waitingGD: "#f9a825",
        completed: "#2e7d32",
        rejected: "#c62828",
    };

    const pieData = [
        { name: "Nháp", value: summary.byStatus?.draft?.count || 0, key: "draft" },
        { name: "Chờ TBP", value: summary.byStatus?.waitingTBP?.count || 0, key: "waitingTBP" },
        { name: "Chờ người phụ trách", value: summary.byStatus?.waitingExpenseReviewer?.count || 0, key: "waitingExpenseReviewer" },
        { name: "Chờ KTT", value: summary.byStatus?.waitingKTT?.count || 0, key: "waitingKTT" },
        { name: "Chờ GĐ", value: summary.byStatus?.waitingGD?.count || 0, key: "waitingGD" },
        { name: "Hoàn thành", value: summary.byStatus?.completed?.count || 0, key: "completed" },
        { name: "Từ chối", value: summary.byStatus?.rejected?.count || 0, key: "rejected" },
    ].filter(x => x.value > 0);
    const summaryByCurrency = summary.byCurrency || [];
    const normalizeCurrencyCode = (value) => String(value || "").trim().toUpperCase();
    const totalCurrencyCode = isNgoaiTe ? normalizeCurrencyCode(maLoaiTien) : "VND";
    const shouldKeepCurrency = (currency) => {
        const code = normalizeCurrencyCode(currency);
        if (!isNgoaiTe) return code === "VND" || code === "";
        if (maLoaiTien) return code === normalizeCurrencyCode(maLoaiTien);
        return code !== "VND" && code !== "";
    };
    const visibleSummaryByCurrency = summaryByCurrency.filter((item) => shouldKeepCurrency(item.maLoaiTien));
    const selectedCurrencySummary = totalCurrencyCode
        ? visibleSummaryByCurrency.find((item) => normalizeCurrencyCode(item.maLoaiTien) === totalCurrencyCode)
        : null;
    const singleCurrencySummary = visibleSummaryByCurrency.length === 1 ? visibleSummaryByCurrency[0] : null;
    const totalAmountDisplay = summary.totalAmount
        ?? selectedCurrencySummary?.amount
        ?? (!isNgoaiTe ? singleCurrencySummary?.amount : null);
    const visibleGrouped = (grouped || []).filter((d) => shouldKeepCurrency(d.maLoaiTien));
    const groupedCurrencies = [...new Set(visibleGrouped.map((d) => normalizeCurrencyCode(d.maLoaiTien)).filter(Boolean))];
    const shouldShowCurrencyInChart = groupedCurrencies.length > 1 || (isNgoaiTe && !maLoaiTien);
    const barData = Array.from(visibleGrouped.reduce((acc, d) => {
        const currency = normalizeCurrencyCode(d.maLoaiTien) || totalCurrencyCode || "";
        const label = `${d.label}${shouldShowCurrencyInChart && currency ? ` (${currency})` : ""}`;
        const key = `${label}__${currency}`;
        const current = acc.get(key) || { label, currency, count: 0, amount: 0 };
        current.count += Number(d.count ?? 0);
        current.amount += Number(d.amount ?? 0);
        acc.set(key, current);
        return acc;
    }, new Map()).values());
    const hasBarData = barData.some(x => x.count > 0 || x.amount > 0);
    return (
        <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
            <Typography variant="h5" gutterBottom fontWeight={700} sx={{ fontSize: { xs: "1.1rem", sm: "1.5rem" }, lineHeight: 1.25 }}>
                Tổng quan phiếu séc {isNgoaiTe ? "ngoại tệ" : "VND"}
            </Typography>

            {/* ── Filter bar ───────────────────────────────────────── */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    flexWrap="wrap"
                    sx={{
                        mb: { xs: 1.25, sm: 2 },
                        p: { xs: 1, sm: 0 },
                        borderRadius: { xs: 2, sm: 0 },
                        border: { xs: (t) => `1px solid ${t.palette.divider}`, sm: "none" },
                        bgcolor: { xs: "background.paper", sm: "transparent" },
                        "& .MuiFormControl-root, & .MuiAutocomplete-root": {
                            width: { xs: "100%", sm: "auto" },
                        },
                        "& .MuiInputBase-root": {
                            fontSize: { xs: "0.86rem", sm: "0.875rem" },
                        },
                        "& .MuiButton-root": {
                            width: { xs: "100%", sm: "auto" },
                            minHeight: { xs: 36, sm: 36 },
                        },
                    }}
                >
                    <DatePicker label="Từ ngày" value={fromDate} onChange={setFromDate} slotProps={{ textField: { size: "small" } }} maxDate={toDate || undefined} />
                    <DatePicker label="Đến ngày" value={toDate} onChange={setToDate} slotProps={{ textField: { size: "small" } }} minDate={fromDate || undefined} />

                    {/* <Autocomplete
                        options={donvis}
                        value={creatorDV} onChange={(_, v) => setCreatorDV(v)}
                        getOptionLabel={(o) => o?.name ?? ""} isOptionEqualToValue={(o, v) => o?.id === v?.id}
                        renderInput={(p) => <TextField {...p} label="Bộ phận đăng ký" size="small" />} sx={{ minWidth: 240 }}
                    /> */}
                    <Autocomplete
                        options={donvis}
                        value={benefitDV} onChange={(_, v) => setBenefitDV(v)}
                        getOptionLabel={(o) => o?.name ?? ""} isOptionEqualToValue={(o, v) => o?.id === v?.id}
                        renderInput={(p) => <TextField {...p} label="Đơn vị thụ hưởng" size="small" />} sx={{ minWidth: { xs: "100%", sm: 240 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                        <InputLabel>Loại séc</InputLabel>
                        <Select
                            label="Loại séc"
                            value={mode}
                            onChange={(e) => {
                                const nextMode = e.target.value;
                                setMode(nextMode);
                                setSearchParams(nextMode === "NgoaiTe" ? { loaiSec: "NgoaiTe" } : {});
                                setMaLoaiTien("");
                            }}
                        >
                            <MenuItem value="VND">VND</MenuItem>
                            <MenuItem value="NgoaiTe">Ngoại tệ</MenuItem>
                        </Select>
                    </FormControl>
                    {isNgoaiTe && (
                        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                            <InputLabel>Loại tiền</InputLabel>
                            <Select label="Loại tiền" value={maLoaiTien} onChange={(e) => setMaLoaiTien(e.target.value)}>
                                <MenuItem value="">Tất cả</MenuItem>
                                {currencies.filter((item) => item.MaLoaiTien !== "VND").map((item) => (
                                    <MenuItem key={item.MaLoaiTien} value={item.MaLoaiTien}>{item.MaLoaiTien}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 }, ml: { xs: 0, md: "auto" } }}>
                        <InputLabel>Nhóm theo</InputLabel>
                        <Select label="Nhóm theo" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                            <MenuItem value="Month">Tháng (YYYY-MM)</MenuItem>
                            <MenuItem value="CreatorDonVi">Bộ phận đăng ký</MenuItem>
                            <MenuItem value="DonViHuongThu">Đơn vị thụ hưởng</MenuItem>
                        </Select>
                    </FormControl>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        <Button variant="outlined" onClick={clearFilters}>Xóa lọc</Button>
                        <Button variant="contained" onClick={loadAll} disabled={loading}>
                            {loading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Áp dụng"}
                        </Button>
                    </Stack>
                </Stack>
            </LocalizationProvider>

            {/* ── Hàng 1: Cards trạng thái (giữ layout 3 cột / hàng) ───────────── */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                    gap: { xs: 1, sm: 2 }, mb: { xs: 1.25, sm: 2 },
                }}
            >
                {[
                    { label: "Nháp", value: statCards.draft, color: "text.secondary" },
                    { label: "Chờ trưởng bộ phận", value: statCards.waitingTBP, color: "warning.main" },
                    { label: "Chờ người phụ trách", value: statCards.waitingExpenseReviewer, color: "success.main" },
                    { label: "Chờ kế toán trưởng", value: statCards.waitingKTT, color: "warning.main" },
                    { label: "Chờ Giám đốc", value: statCards.waitingGD, color: "warning.main" },
                    { label: "Hoàn thành", value: statCards.completed, color: "success.main" },
                    { label: "Từ chối", value: statCards.rejected, color: "error.main" },
                ].map((c, i) => (
                    <Paper key={i} elevation={1} sx={{
                        p: { xs: 1.15, sm: 3 }, textAlign: "center", borderRadius: 2, border: (t) => `1px solid ${t.palette.divider}`,
                        minHeight: { xs: 78, sm: 100 }, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5, fontSize: { xs: "0.74rem", sm: "1rem" }, lineHeight: 1.2 }}>{c.label}</Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color: c.color, fontSize: { xs: "1.7rem", sm: "3rem" }, lineHeight: 1 }}>{c.value ?? 0}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* ── Analytics: Tổng & Biểu đồ ───────────────────────────────────── */}
            <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, overflow: "hidden" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Phân tích</Typography>

                {/* Summary row */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} flexWrap="wrap" sx={{ mb: 2 }}>
                    <Box sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, minWidth: { xs: "100%", sm: 220 } }}>
                        <Typography variant="body2" color="text.secondary">Tổng số séc</Typography>
                        <Typography variant="h5" fontWeight={800}>{summary.totalCount?.toLocaleString("vi-VN")}</Typography>
                    </Box>
                    {(!isNgoaiTe || maLoaiTien) && (
                        <Box sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, minWidth: { xs: "100%", sm: 220 } }}>
                            <Typography variant="body2" color="text.secondary">Tổng số tiền</Typography>
                            <Typography variant="h5" fontWeight={800}>{fmtMoney(totalAmountDisplay)} {totalCurrencyCode}</Typography>
                        </Box>
                    )}
                    {isNgoaiTe && !maLoaiTien && visibleSummaryByCurrency.map((item) => (
                        <Box key={item.maLoaiTien} sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, minWidth: { xs: "100%", sm: 220 } }}>
                            <Typography variant="body2" color="text.secondary">Tổng {item.maLoaiTien}</Typography>
                            <Typography variant="h5" fontWeight={800}>{fmtMoney(item.amount)} {item.maLoaiTien}</Typography>
                        </Box>
                    ))}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Charts row: Bar (left) + Pie (right) */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1, minHeight: { xs: 260, sm: 320 }, minWidth: 0 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Biểu đồ cột — {groupBy === "Month" ? "Theo tháng (YYYY-MM)" : groupBy === "CreatorDonVi" ? "Theo bộ phận đăng ký" : "Theo đơn vị thụ hưởng"}
                        </Typography>

                        {!hasBarData ? (
                            <Paper variant="outlined" sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2 }}>
                                <Typography color="text.secondary">Không có dữ liệu phù hợp</Typography>
                            </Paper>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={barData}
                                    margin={{ top: 8, right: 28, left: 0, bottom: 8 }}
                                    barCategoryGap={16}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        interval={0}
                                        tick={{ fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <YAxis yAxisId="left" allowDecimals={false} width={34} />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        width={72}
                                        tickFormatter={fmtCompactMoney}
                                    />
                                    <Tooltip
                                        formatter={(value, name, item) => {
                                            if (item?.dataKey === "amount") {
                                                const currency = item?.payload?.currency || totalCurrencyCode || "VND";
                                                return [`${fmtMoney(value)} ${currency}`, "Tổng tiền"];
                                            }
                                            return [Number(value).toLocaleString("vi-VN"), "Số séc"];
                                        }}
                                    />
                                    <Legend />
                                    {/* Màu nhẹ, không sặc sỡ */}
                                    <Bar yAxisId="left" dataKey="count" name="Số séc" fill="#90a4ae" />
                                    <Bar yAxisId="right" dataKey="amount" name="Tổng tiền" fill="#1976d2" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>

                    <Box sx={{ flex: 1, minHeight: { xs: 260, sm: 320 }, minWidth: 0 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Tỷ trọng theo trạng thái
                        </Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                                    {pieData.map((e, i) => (
                                        <Cell key={i} fill={STATUS_COLORS[e.key] || "#8884d8"} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
}
