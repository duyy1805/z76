import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Collapse,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hoaDonApi } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { REVENUE_TYPE_LABELS } from "../utils/hoa-don";
import { buildRevenueTypeRows, groupExportCustomers } from "../utils/hoa-don-dashboard";

const emptyDashboard = {
    period: {},
    summary: { invoiceCount: 0, revenueVnd: 0, missingConvertedCount: 0 },
    byRevenueType: [],
    byDepartment: [],
    exportByCurrency: [],
    exportByCustomer: [],
    filterOptions: { revenueTypes: [], invoiceTypes: [], departments: [] },
};

const CHART_COLORS = ["#1976d2", "#7b1fa2", "#00897b", "#ef6c00", "#d32f2f", "#5c6bc0"];

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const formatOriginalAmount = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 4 });
const formatCompactVnd = (value) => {
    const number = Number(value || 0);
    if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
    if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
    if (Math.abs(number) >= 1_000) return `${(number / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} nghìn`;
    return formatVnd(number);
};

function currentMonthPeriod() {
    const today = dayjs();
    return {
        dateFrom: today.startOf("month").format("YYYY-MM-DD"),
        dateTo: today.format("YYYY-MM-DD"),
    };
}

function initialFilters() {
    return {
        ...currentMonthPeriod(),
        revenueTypes: [],
        invoiceTypes: [],
        departments: [],
    };
}

function revenueTypeLabel(value) {
    return REVENUE_TYPE_LABELS[value] || (value === "ChuaPhanLoai" ? "Chưa phân loại" : value || "Chưa phân loại");
}

function RevenueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload || {};
    return (
        <Paper sx={{ p: 1.25, border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" fontWeight={700}>{item.fullLabel || label || item.label}</Typography>
            <Typography variant="body2">{formatVnd(item.revenueVnd)} VND</Typography>
            <Typography variant="caption" color="text.secondary">{formatVnd(item.invoiceCount)} hóa đơn</Typography>
        </Paper>
    );
}

export default function HoaDonRevenueDashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const initialPeriod = useMemo(initialFilters, []);
    const [filters, setFilters] = useState(initialPeriod);
    const [dashboard, setDashboard] = useState(emptyDashboard);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedTypes, setExpandedTypes] = useState(new Set());
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        if (!user?.id || !user?.idDonVi) return;
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError("");
        try {
            const result = await hoaDonApi.getRevenueDashboard({
                userId: user.id,
                idDonVi: user.idDonVi,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                revenueTypes: filters.revenueTypes.map((item) => item.value),
                invoiceTypes: filters.invoiceTypes.map((item) => item.value),
                departmentIds: filters.departments.map((item) => item.id),
            });
            if (requestId === requestIdRef.current) setDashboard({ ...emptyDashboard, ...result });
        } catch (requestError) {
            if (requestId === requestIdRef.current) {
                setError(requestError?.response?.data?.message || "Không lấy được dữ liệu Dashboard doanh thu.");
            }
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [filters, user?.id, user?.idDonVi]);

    useEffect(() => {
        requestIdRef.current += 1;
        if (!filters.dateFrom || !filters.dateTo) {
            setLoading(false);
            setError("Chọn đầy đủ từ ngày và đến ngày.");
            return undefined;
        }
        if (filters.dateFrom > filters.dateTo) {
            setLoading(false);
            setError("Từ ngày không được lớn hơn đến ngày.");
            return undefined;
        }
        const timer = window.setTimeout(load, 300);
        return () => window.clearTimeout(timer);
    }, [load, filters.dateFrom, filters.dateTo]);

    const typeRows = useMemo(() => buildRevenueTypeRows(
        dashboard.byRevenueType,
        dashboard.byDepartment,
        dashboard.summary?.revenueVnd,
    ), [dashboard]);
    const customerRows = useMemo(() => groupExportCustomers(dashboard.exportByCustomer), [dashboard.exportByCustomer]);
    const chartData = useMemo(() => typeRows.map((item) => ({
        ...item,
        label: revenueTypeLabel(item.revenueType),
    })), [typeRows]);
    const revenueTypeOptions = useMemo(() => {
        const order = new Map(Object.keys(REVENUE_TYPE_LABELS).map((value, index) => [value, index]));
        return (dashboard.filterOptions?.revenueTypes || [])
            .map((item) => ({ value: item.value, label: revenueTypeLabel(item.value) }))
            .sort((left, right) => (order.get(left.value) ?? 999) - (order.get(right.value) ?? 999));
    }, [dashboard.filterOptions?.revenueTypes]);
    const invoiceTypeOptions = useMemo(
        () => dashboard.filterOptions?.invoiceTypes || [],
        [dashboard.filterOptions?.invoiceTypes],
    );
    const departmentOptions = useMemo(
        () => [...(dashboard.filterOptions?.departments || [])].sort((left, right) => left.label.localeCompare(right.label, "vi")),
        [dashboard.filterOptions?.departments],
    );
    const departmentChartData = useMemo(() => {
        const grouped = new Map();
        (dashboard.byDepartment || []).forEach((item) => {
            const key = String(item.departmentId ?? item.departmentName ?? "Chưa xác định");
            const current = grouped.get(key) || {
                label: item.departmentName || "Chưa xác định",
                invoiceCount: 0,
                revenueVnd: 0,
            };
            current.invoiceCount += Number(item.invoiceCount || 0);
            current.revenueVnd += Number(item.revenueVnd || 0);
            grouped.set(key, current);
        });
        return Array.from(grouped.values())
            .sort((left, right) => right.revenueVnd - left.revenueVnd)
            .slice(0, 10)
            .map((item) => ({
                ...item,
                fullLabel: item.label,
                label: item.label.length > 24 ? `${item.label.slice(0, 23)}…` : item.label,
            }));
    }, [dashboard.byDepartment]);

    const resetCurrentMonth = () => {
        const period = currentMonthPeriod();
        setFilters((current) => ({ ...current, ...period }));
    };

    const clearBusinessFilters = () => {
        setFilters((current) => ({
            ...current,
            revenueTypes: [],
            invoiceTypes: [],
            departments: [],
        }));
    };

    const toggleType = (revenueType) => setExpandedTypes((current) => {
        const next = new Set(current);
        if (next.has(revenueType)) next.delete(revenueType);
        else next.add(revenueType);
        return next;
    });

    const hasData = Number(dashboard.summary?.invoiceCount || 0) > 0;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25, minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
                <Box>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/hoa-don-dien-tu")} sx={{ mb: 0.5 }}>Danh sách hóa đơn</Button>
                    <Typography variant="h5" fontWeight={750}>Dashboard doanh thu hóa đơn</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Chỉ tổng hợp hóa đơn đã xuất theo ngày hóa đơn.</Typography>
                </Box>
                <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>Tải lại</Button>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Stack spacing={1.5}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
                        <TextField
                            size="small"
                            type="date"
                            label="Từ ngày"
                            value={filters.dateFrom}
                            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                            inputProps={{ max: filters.dateTo }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Đến ngày"
                            value={filters.dateTo}
                            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                            inputProps={{ min: filters.dateFrom }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button variant="outlined" onClick={resetCurrentMonth}>Tháng hiện tại</Button>
                        {loading && <CircularProgress size={24} />}
                    </Stack>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            filterSelectedOptions
                            limitTags={2}
                            size="small"
                            options={revenueTypeOptions}
                            value={filters.revenueTypes}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            getOptionLabel={(option) => option.label}
                            onChange={(_, value) => setFilters((current) => ({ ...current, revenueTypes: value }))}
                            noOptionsText="Không có loại hình trong kỳ"
                            renderInput={(params) => <TextField {...params} label="Loại hình doanh thu" placeholder={filters.revenueTypes.length ? "" : "Tất cả"} />}
                        />
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            filterSelectedOptions
                            limitTags={2}
                            size="small"
                            options={invoiceTypeOptions}
                            value={filters.invoiceTypes}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            getOptionLabel={(option) => option.label}
                            onChange={(_, value) => setFilters((current) => ({ ...current, invoiceTypes: value }))}
                            noOptionsText="Không có loại hóa đơn trong kỳ"
                            renderInput={(params) => <TextField {...params} label="Loại hóa đơn" placeholder={filters.invoiceTypes.length ? "" : "Tất cả"} />}
                        />
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            filterSelectedOptions
                            limitTags={2}
                            size="small"
                            options={departmentOptions}
                            value={filters.departments}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            getOptionLabel={(option) => option.label}
                            onChange={(_, value) => setFilters((current) => ({ ...current, departments: value }))}
                            noOptionsText="Không có bộ phận trong kỳ"
                            renderInput={(params) => <TextField {...params} label="Bộ phận đăng ký" placeholder={filters.departments.length ? "" : "Tất cả"} />}
                        />
                    </Box>

                    <Box>
                        <Button startIcon={<FilterAltOffIcon />} size="small" onClick={clearBusinessFilters}>
                            Xóa bộ lọc
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}
            {dashboard.summary?.missingConvertedCount > 0 && (
                <Alert severity="warning">
                    Có {formatVnd(dashboard.summary.missingConvertedCount)} hóa đơn ngoại tệ chưa có giá trị quy đổi VND; tổng doanh thu chưa bao gồm các giá trị này.
                </Alert>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography color="text.secondary">Tổng doanh thu quy đổi</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75 }}>{formatVnd(dashboard.summary?.revenueVnd)} VND</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {dashboard.period?.dateFrom || filters.dateFrom} đến {dashboard.period?.dateTo || filters.dateTo}
                    </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography color="text.secondary">Số hóa đơn đã xuất</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75 }}>{formatVnd(dashboard.summary?.invoiceCount)}</Typography>
                    <Typography variant="caption" color="text.secondary">Tổng hợp theo số lượng hóa đơn</Typography>
                </Paper>
            </Box>

            {!loading && !hasData && !error && <Alert severity="info">Không có hóa đơn đã xuất phù hợp với khoảng ngày và các bộ lọc đã chọn.</Alert>}

            {hasData && (
                <>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={750} sx={{ mb: 2 }}>Doanh thu theo loại hình</Typography>
                        <Box sx={{ width: "100%", height: 320 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 42 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" angle={-18} textAnchor="end" interval={0} height={72} />
                                    <YAxis tickFormatter={formatCompactVnd} width={82} />
                                    <Tooltip content={<RevenueTooltip />} />
                                    <Bar dataKey="revenueVnd" fill="#1976d2" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.8fr) minmax(0, 1.2fr)" }, gap: 2 }}>
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 3, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={750}>Tỷ trọng doanh thu</Typography>
                            <Typography variant="body2" color="text.secondary">Theo từng loại hình doanh thu</Typography>
                            <Box sx={{ width: "100%", height: 340 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            dataKey="revenueVnd"
                                            nameKey="label"
                                            cx="50%"
                                            cy="46%"
                                            innerRadius={62}
                                            outerRadius={105}
                                            paddingAngle={2}
                                            label={({ percent }) => percent >= 0.03 ? `${(percent * 100).toFixed(1)}%` : ""}
                                        >
                                            {chartData.map((item, index) => <Cell key={item.revenueType} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<RevenueTooltip />} />
                                        <Legend verticalAlign="bottom" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 3, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={750}>Doanh thu theo bộ phận</Typography>
                            <Typography variant="body2" color="text.secondary">10 bộ phận có doanh thu cao nhất</Typography>
                            <Box sx={{ width: "100%", height: 340, mt: 1 }}>
                                <ResponsiveContainer>
                                    <BarChart data={departmentChartData} layout="vertical" margin={{ top: 8, right: 28, left: 18, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={formatCompactVnd} />
                                        <YAxis type="category" dataKey="label" width={155} tick={{ fontSize: 12 }} />
                                        <Tooltip content={<RevenueTooltip />} />
                                        <Bar dataKey="revenueVnd" fill="#00897b" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Box>
                </>
            )}

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={750}>Chi tiết loại hình và bộ phận đăng ký</Typography>
                </Box>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 760 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={52} />
                                <TableCell>Loại hình doanh thu</TableCell>
                                <TableCell align="right">Số hóa đơn</TableCell>
                                <TableCell align="right">Doanh thu VND</TableCell>
                                <TableCell align="right">Tỷ trọng</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {typeRows.map((item) => {
                                const expanded = expandedTypes.has(item.revenueType);
                                return (
                                    <Fragment key={item.revenueType}>
                                        <TableRow hover>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => toggleType(item.revenueType)} disabled={!item.departments.length} aria-label="Xem bộ phận">
                                                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell><b>{revenueTypeLabel(item.revenueType)}</b></TableCell>
                                            <TableCell align="right">{formatVnd(item.invoiceCount)}</TableCell>
                                            <TableCell align="right">{formatVnd(item.revenueVnd)}</TableCell>
                                            <TableCell align="right">{(Number(item.share || 0) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ py: 0, bgcolor: "action.hover" }}>
                                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                    <Table size="small" sx={{ my: 1, ml: { xs: 0, md: 4 }, width: { xs: "100%", md: "calc(100% - 32px)" } }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Bộ phận đăng ký</TableCell>
                                                                <TableCell align="right">Số hóa đơn</TableCell>
                                                                <TableCell align="right">Doanh thu VND</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {item.departments.map((department) => (
                                                                <TableRow key={`${item.revenueType}-${department.departmentId ?? department.departmentName}`}>
                                                                    <TableCell>{department.departmentName || "Chưa xác định"}</TableCell>
                                                                    <TableCell align="right">{formatVnd(department.invoiceCount)}</TableCell>
                                                                    <TableCell align="right">{formatVnd(department.revenueVnd)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                );
                            })}
                            {!typeRows.length && <TableRow><TableCell colSpan={5} align="center">Không có dữ liệu</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={750}>Doanh thu xuất khẩu theo loại tiền</Typography>
                </Box>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 620 }}>
                        <TableHead><TableRow><TableCell>Loại tiền</TableCell><TableCell align="right">Số hóa đơn</TableCell><TableCell align="right">Tổng nguyên tệ</TableCell><TableCell align="right">Quy đổi VND</TableCell></TableRow></TableHead>
                        <TableBody>
                            {(dashboard.exportByCurrency || []).map((item) => (
                                <TableRow key={item.currencyCode}>
                                    <TableCell><b>{item.currencyCode}</b></TableCell>
                                    <TableCell align="right">{formatVnd(item.invoiceCount)}</TableCell>
                                    <TableCell align="right">{formatOriginalAmount(item.originalAmount)} {item.currencyCode}</TableCell>
                                    <TableCell align="right">{formatVnd(item.revenueVnd)}</TableCell>
                                </TableRow>
                            ))}
                            {!dashboard.exportByCurrency?.length && <TableRow><TableCell colSpan={4} align="center">Không có doanh thu xuất khẩu</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={750}>Doanh thu xuất khẩu theo khách hàng</Typography>
                </Box>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 900 }}>
                        <TableHead><TableRow><TableCell>Khách hàng</TableCell><TableCell>Mã số thuế</TableCell><TableCell align="right">Số hóa đơn</TableCell><TableCell>Chi tiết nguyên tệ</TableCell><TableCell align="right">Tổng VND</TableCell></TableRow></TableHead>
                        <TableBody>
                            {customerRows.map((customer) => (
                                <TableRow key={customer.customerKey}>
                                    <TableCell><b>{customer.customerName}</b></TableCell>
                                    <TableCell>{customer.taxCode || "—"}</TableCell>
                                    <TableCell align="right">{formatVnd(customer.invoiceCount)}</TableCell>
                                    <TableCell>
                                        <Stack spacing={0.25}>
                                            {customer.currencies.map((currency) => (
                                                <Typography variant="body2" key={currency.currencyCode}>
                                                    {currency.currencyCode}: {formatOriginalAmount(currency.originalAmount)} · {formatVnd(currency.invoiceCount)} HĐ
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right">{formatVnd(customer.revenueVnd)}</TableCell>
                                </TableRow>
                            ))}
                            {!customerRows.length && <TableRow><TableCell colSpan={5} align="center">Không có dữ liệu khách hàng xuất khẩu</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
