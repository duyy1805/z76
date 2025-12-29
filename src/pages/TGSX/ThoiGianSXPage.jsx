import React, { useEffect, useState } from "react";
import {
    Paper, Typography, Grid, TextField, Button,
    Table, TableHead, TableRow, TableCell, TableBody,
    Stack, Box, CircularProgress, Tooltip as MuiTooltip,
} from "@mui/material";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { apiTGSX } from "../../lib/api_tgsx";

/* ================== HELPERS ================== */
const secToHour = (s) =>
    s == null ? "—" : (s / 3600).toFixed(4);

const tableHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    color: "#555",
};

export default function ThoiGianSXPage() {
    const [fromDate, setFromDate] = useState(dayjs().startOf("month"));
    const [toDate, setToDate] = useState(dayjs());
    const [maDonHang, setMaDonHang] = useState("");
    const [tenDonVi, setTenDonVi] = useState("");

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    /* ================== LOAD DATA ================== */
    const loadData = async () => {
        // ❌ chỉ chặn khi CẢ HAI đều rỗng
        if (
            (!maDonHang || maDonHang.trim() === "") &&
            (!tenDonVi || tenDonVi.trim() === "")
        ) {
            return;
        }

        setLoading(true);
        try {
            const res = await apiTGSX.getTableData({
                maDonHang: maDonHang || "",
                tenDonVi: tenDonVi || "",
            });
            console.log("TGSX table data:", res);
            setRows(res.data || []);
        } catch (err) {
            console.error("Load TGSX table error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    /* ================== CHART DATA (TỔNG HỢP) ================== */
    const chartData = [
        {
            name: "Theo hiệu suất",
            value: rows.reduce((s, r) => s + (r.TongTG_TheoHS_Giay || 0), 0),
            color: "#1976D2",
        },
        {
            name: "Thừa",
            value: rows.reduce((s, r) => s + Math.max(r.Thua_Giay || 0, 0), 0),
            color: "#F44336",
        },
    ];

    const calcTGThucTe = (sanLuong, tgTheoHS) => {
        if (sanLuong == null || tgTheoHS == null) return null;
        return sanLuong * tgTheoHS;
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" mb={3}>
                    Danh sách thời gian sản xuất các bộ phận
                </Typography>

                {/* ================== FILTER ================== */}
                <Grid container spacing={2} alignItems="flex-start" mb={2}>
                    <Grid item xs={12} md={7}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Phân xưởng"
                                    value={tenDonVi}
                                    onChange={(e) => setTenDonVi(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Đơn hàng"
                                    value={maDonHang}
                                    onChange={(e) => setMaDonHang(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <DatePicker
                                    label="Từ ngày"
                                    value={fromDate}
                                    onChange={setFromDate}
                                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <DatePicker
                                    label="Đến ngày"
                                    value={toDate}
                                    onChange={setToDate}
                                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    sx={{ height: 40 }}
                                    onClick={loadData}
                                >
                                    Tìm kiếm
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* ================== CHART ================== */}
                    <Grid item xs={12} md={5}>
                        <Box sx={{ width: 360, height: 180 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        innerRadius={50}
                                        outerRadius={70}
                                    >
                                        {chartData.map((e, i) => (
                                            <Cell key={i} fill={e.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Grid>
                </Grid>

                {/* ================== TABLE ================== */}
                <Box sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={tableHeaderSx}>Phân xưởng</TableCell>
                                <TableCell sx={tableHeaderSx}>Tổ</TableCell>
                                <TableCell sx={tableHeaderSx}>ID KHSX</TableCell>
                                <TableCell sx={tableHeaderSx} align="right">NS dự kiến</TableCell>
                                <TableCell sx={tableHeaderSx}>Đơn hàng</TableCell>
                                <TableCell sx={tableHeaderSx}>ItemCode</TableCell>
                                <TableCell sx={tableHeaderSx}>Nhóm</TableCell>
                                <TableCell sx={tableHeaderSx} align="center">Tuần HS</TableCell>
                                <TableCell sx={tableHeaderSx} align="right">TG chuẩn (giờ)</TableCell>
                                <TableCell sx={tableHeaderSx} align="right">TG theo HS (giờ)</TableCell>
                                <TableCell sx={tableHeaderSx} align="right">TG SX thực tế (giờ)</TableCell>
                                <TableCell sx={tableHeaderSx} align="right">Thừa (giờ)</TableCell>
                            </TableRow>
                            <TableRow
                                sx={{
                                    "& td": {
                                        fontStyle: "italic",
                                        color: "#666",
                                        fontSize: 13,
                                        backgroundColor: "#fafafa",
                                    },
                                }}
                            >
                                <TableCell align="center">(1)</TableCell>
                                <TableCell align="center">(2)</TableCell>
                                <TableCell align="center">(3)</TableCell>
                                <TableCell align="center">(4)</TableCell>
                                <TableCell align="center">(5)</TableCell>
                                <TableCell align="center">(6)</TableCell>
                                <TableCell align="center">(7)</TableCell>
                                <TableCell align="center">(8)</TableCell>

                                {/* Cột nghiệp vụ */}
                                <TableCell align="center">(9)</TableCell>
                                <TableCell align="center">(10 = 9 / HS)</TableCell>
                                <TableCell align="center">(11 = 4 × 10)</TableCell>
                                <TableCell align="center">(12)</TableCell>
                            </TableRow>
                        </TableHead>


                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={12} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && rows.map((r, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{r.PhanXuong}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <MuiTooltip title={r.Ten_BoPhan || ""} arrow placement="top">
                                            <Typography
                                                noWrap
                                                sx={{
                                                    maxWidth: 180,
                                                    cursor: "default",
                                                }}
                                            >
                                                {r.Ten_BoPhan}
                                            </Typography>
                                        </MuiTooltip>
                                    </TableCell>

                                    <TableCell>{r.ID_KeHoachSanXuat}</TableCell>
                                    <TableCell align="right">{r.NangSuat_DuKien ?? "—"}</TableCell>

                                    <TableCell>{r.Ma_DonHang}</TableCell>
                                    <TableCell>{r.ItemCode}</TableCell>
                                    <TableCell>{r.TenNhom}</TableCell>
                                    <TableCell align="center">{r.SoTuan_HieuSuat}</TableCell>

                                    <TableCell align="right">
                                        {secToHour(r.TongTG_Chuan_Giay)}
                                    </TableCell>

                                    <TableCell align="right">
                                        {secToHour(r.TongTG_TheoHS_Giay)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {secToHour(
                                            calcTGThucTe(r.NangSuat_DuKien, r.TongTG_TheoHS_Giay)
                                        )}
                                    </TableCell>

                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: r.Thua_Giay < 0 ? "red" : "inherit",
                                            fontWeight: r.Thua_Giay < 0 ? "bold" : "normal",
                                        }}
                                    >
                                        {secToHour(r.Thua_Giay)}
                                    </TableCell>
                                </TableRow>

                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>
        </LocalizationProvider>
    );
}
