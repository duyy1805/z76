import { useEffect, useState, useCallback } from "react";
import {
    Box, Paper, Typography, Stack, Button, TextField, Autocomplete, CircularProgress, Divider, MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export default function Dashboard() {
    const { user, role } = useAuth();

    // ─── Filters ──────────────────────────────────────────────────────────────
    const [donvis, setDonvis] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [creatorDV, setCreatorDV] = useState(null);
    const [benefitDV, setBenefitDV] = useState(null);
    const [groupBy, setGroupBy] = useState("Month"); // Month|CreatorDonVi|DonViHuongThu

    // ─── Status cards (giữ như bạn có) ───────────────────────────────────────
    const [statCards, setStatCards] = useState({
        waitingTBP: 0, waitingKTT: 0, waitingGD: 0, completed: 0, rejected: 0,
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
    });

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            // 1) Cards cũ (nếu bạn đang lấy từ /dashboard)
            const cards = await api.getDashboard(buildCommonParams());
            setStatCards(cards);

            // 2) Summary
            const sum = await api.getDashboardSummary(buildCommonParams());
            setSummary(sum);

            // 3) Grouped
            const grp = await api.getDashboardGrouped({ ...buildCommonParams(), groupBy });
            setGrouped(grp);
            console.log("Grouped data:", grp);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, role, user?.idDonVi, fromDate, toDate, creatorDV?.id, benefitDV?.id, groupBy]);

    useEffect(() => {
        (async () => {
            const list = await api.listDonVi();
            setDonvis(list || []);
            await loadAll();
        })();
    }, [loadAll]);

    const clearFilters = async () => {
        setFromDate(null);
        setToDate(null);
        setCreatorDV(null);
        setBenefitDV(null);
        await loadAll();
    };

    // Colors for pie (status)
    const STATUS_COLORS = {
        waitingTBP: "#fbc02d",
        waitingKTT: "#fdd835",
        waitingGD: "#f9a825",
        completed: "#2e7d32",
        rejected: "#c62828",
    };

    const pieData = [
        { name: "Chờ TBP", value: summary.byStatus?.waitingTBP?.count || 0, key: "waitingTBP" },
        { name: "Chờ KTT", value: summary.byStatus?.waitingKTT?.count || 0, key: "waitingKTT" },
        { name: "Chờ GĐ", value: summary.byStatus?.waitingGD?.count || 0, key: "waitingGD" },
        { name: "Hoàn thành", value: summary.byStatus?.completed?.count || 0, key: "completed" },
        { name: "Từ chối", value: summary.byStatus?.rejected?.count || 0, key: "rejected" },
    ].filter(x => x.value > 0);
    const barData = (grouped || []).map(d => ({
        label: d.label,
        count: Number(d.count ?? 0),
        amount: Number(d.amount ?? 0),
    }));
    const hasBarData = barData.some(x => x.count > 0 || x.amount > 0);
    return (
        <Box>
            <Typography variant="h5" gutterBottom fontWeight={700}>
                Tổng quan phiếu séc
            </Typography>

            {/* ── Filter bar ───────────────────────────────────────── */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
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
                        renderInput={(p) => <TextField {...p} label="Đơn vị thụ hưởng" size="small" />} sx={{ minWidth: 240 }}
                    />

                    <FormControl size="small" sx={{ minWidth: 150, ml: { xs: 0, md: "auto" } }}>
                        <InputLabel>Nhóm theo</InputLabel>
                        <Select label="Nhóm theo" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                            <MenuItem value="Month">Tháng (YYYY-MM)</MenuItem>
                            <MenuItem value="CreatorDonVi">Bộ phận đăng ký</MenuItem>
                            <MenuItem value="DonViHuongThu">Đơn vị thụ hưởng</MenuItem>
                        </Select>
                    </FormControl>

                    <Stack direction="row" spacing={1}>
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
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                    gap: 2, mb: 2,
                }}
            >
                {[
                    { label: "Chờ trưởng bộ phận", value: statCards.waitingTBP, color: "warning.main" },
                    { label: "Chờ kế toán trưởng", value: statCards.waitingKTT, color: "warning.main" },
                    { label: "Chờ Giám đốc", value: statCards.waitingGD, color: "warning.main" },
                    { label: "Hoàn thành", value: statCards.completed, color: "success.main" },
                    { label: "Từ chối", value: statCards.rejected, color: "error.main" },
                ].map((c, i) => (
                    <Paper key={i} elevation={1} sx={{
                        p: 3, textAlign: "center", borderRadius: 2, border: (t) => `1px solid ${t.palette.divider}`,
                        height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}>{c.label}</Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color: c.color }}>{c.value ?? 0}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* ── Analytics: Tổng & Biểu đồ ───────────────────────────────────── */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Phân tích</Typography>

                {/* Summary row */}
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, minWidth: 220 }}>
                        <Typography variant="body2" color="text.secondary">Tổng số séc</Typography>
                        <Typography variant="h5" fontWeight={800}>{summary.totalCount?.toLocaleString("vi-VN")}</Typography>
                    </Box>
                    <Box sx={{ p: 2, borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, minWidth: 220 }}>
                        <Typography variant="body2" color="text.secondary">Tổng số tiền</Typography>
                        <Typography variant="h5" fontWeight={800}>{fmtMoney(summary.totalAmount)} đ</Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Charts row: Bar (left) + Pie (right) */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1, minHeight: 320 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Biểu đồ cột — {groupBy === "Month" ? "Theo tháng (YYYY-MM)" : groupBy === "CreatorDonVi" ? "Theo bộ phận đăng ký" : "Theo đơn vị thụ hưởng"}
                        </Typography>

                        {!hasBarData ? (
                            <Paper variant="outlined" sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2 }}>
                                <Typography color="text.secondary">Không có dữ liệu phù hợp</Typography>
                            </Paper>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={barData}
                                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                                    barCategoryGap={16}
                                >
                                    <XAxis dataKey="label" />
                                    {/* Tách 2 trục Y: trái = count, phải = amount */}
                                    <YAxis yAxisId="left" />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tickFormatter={(v) => v.toLocaleString("vi-VN")}
                                    />
                                    <Tooltip
                                        formatter={(v, n) =>
                                            n === "Tổng tiền" ? `${Number(v).toLocaleString("vi-VN")} đ` : v
                                        }
                                    />
                                    <Legend />
                                    {/* Màu nhẹ, không sặc sỡ */}
                                    <Bar yAxisId="left" dataKey="count" name="Số séc" fill="#90a4ae" />
                                    <Bar yAxisId="right" dataKey="amount" name="Tổng tiền" fill="#1976d2" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>

                    <Box sx={{ flex: 1, minHeight: 320 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Tỷ trọng theo trạng thái
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
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
