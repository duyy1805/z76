import React, { useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    Stack, Button, TextField, Grid, Chip
} from "@mui/material";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ============================
// MOCK DATA GIỮ NGUYÊN
// ============================
const mockLaborNorms = [
    { id: 1, date: "2023-10-27", type: "SP001/Loại A", itemCode: "ITEM-A1", product: "Sản phẩm mẫu 1" },
    { id: 2, date: "2023-10-27", type: "SP001/Loại B", itemCode: "ITEM-A2", product: "Sản phẩm mẫu 2" },
    { id: 3, date: "2023-10-27", type: "SP001/Loại C", itemCode: "ITEM-A3", product: "Sản phẩm mẫu 3" },
];

const mockProductionData = [
    { id: 1, workshop: "01/Xưởng 1", group: "Tổ 1", order: "DH-123", product: "Sản phẩm A", itemCode: "ITEM-A1/Lắp ráp", capacity: 100, totalTime: 120, efficiency: 83.3, effTime: 100, excessTime: 20 },
    { id: 2, workshop: "01/Xưởng 1", group: "Tổ 2", order: "DH-123", product: "Sản phẩm A", itemCode: "ITEM-A1/Lắp ráp", capacity: 100, totalTime: 120, efficiency: 83.3, effTime: 100, excessTime: 20 },
    { id: 3, workshop: "02/Xưởng 2", group: "Tổ 1", order: "DH-124", product: "Sản phẩm B", itemCode: "ITEM-B1/Đóng gói", capacity: 150, totalTime: 140, efficiency: 107.1, effTime: 150, excessTime: 0 },
    { id: 4, workshop: "02/Xưởng 2", group: "Tổ 2", order: "DH-125", product: "Sản phẩm C", itemCode: "ITEM-C1/Kiểm tra", capacity: 200, totalTime: 180, efficiency: 111.1, effTime: 200, excessTime: 0 },
];

const mockChartData = [
    { name: "Hoạt động", value: 70, color: "#1976D2" },
    { name: "Chờ", value: 20, color: "#FFC107" },
    { name: "Sự cố", value: 10, color: "#F44336" },
];

// ============================
// COMPONENT CHÍNH
// ============================
const ProductionDashboard = () => {
    const [menu, setMenu] = useState("dinhmuc");
    const [fromDate, setFromDate] = useState(dayjs("2023-10-01"));
    const [toDate, setToDate] = useState(dayjs("2023-10-31"));

    const tableHeaderSx = {
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        color: "#555",
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: "flex", height: "100vh" }}>

                {/* ================= SIDEBAR ================= */}
                <Paper
                    elevation={3}
                    sx={{
                        width: 240,
                        p: 2,
                        borderRadius: 0,
                        bgcolor: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2
                    }}
                >
                    <Typography variant="h6" fontWeight="bold">
                        Menu
                    </Typography>

                    <Button
                        variant={menu === "dinhmuc" ? "contained" : "outlined"}
                        onClick={() => setMenu("dinhmuc")}
                        sx={{ textTransform: "none" }}
                    >
                        Định mức lao động
                    </Button>

                    <Button
                        variant={menu === "thoigian" ? "contained" : "outlined"}
                        onClick={() => setMenu("thoigian")}
                        sx={{ textTransform: "none" }}
                    >
                        Thời gian sản xuất
                    </Button>
                </Paper>

                {/* ================= MAIN CONTENT ================= */}
                <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>

                    <Typography variant="h5" sx={{ mb: 3, fontWeight: "600", color: "#1a237e" }}>
                        Ứng dụng tính thời gian sản xuất
                    </Typography>

                    {/* ============================================= */}
                    {/* ============ 1) ĐỊNH MỨC LAO ĐỘNG ============ */}
                    {/* ============================================= */}
                    {menu === "dinhmuc" && (
                        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold">
                                    Danh sách định mức lao động
                                </Typography>

                                <Stack direction="row" spacing={2}>
                                    <Button variant="outlined">Danh mục ĐMLĐ</Button>
                                    <Button variant="contained">Import</Button>
                                    <TextField placeholder="Tìm kiếm" size="small" />
                                </Stack>
                            </Stack>

                            {/* TABLE GIỮ NGUYÊN */}
                            <TableContainerComponent>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={tableHeaderSx}>Thời gian sản xuất</TableCell>
                                            <TableCell sx={tableHeaderSx}>TT/Chủng loại SP</TableCell>
                                            <TableCell sx={tableHeaderSx}>Itemcode</TableCell>
                                            <TableCell sx={tableHeaderSx}>Sản phẩm</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockLaborNorms.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.date}</TableCell>
                                                <TableCell>{row.type}</TableCell>
                                                <TableCell>{row.itemCode}</TableCell>
                                                <TableCell>{row.product}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainerComponent>
                        </Paper>
                    )}

                    {/* ============================================= */}
                    {/* ========= 2) THỜI GIAN SẢN XUẤT ============== */}
                    {/* ============================================= */}
                    {menu === "thoigian" && (
                        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>

                            <Typography variant="h6" fontWeight="bold" mb={3}>
                                Danh sách thời gian sản xuất các bộ phận
                            </Typography>

                            <Grid container spacing={2} alignItems="flex-start">

                                {/* Filter bên trái */}
                                <Grid item xs={12} md={7}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField fullWidth label="Phân xưởng" size="small" defaultValue="Xưởng 1" />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField fullWidth label="Đơn hàng" size="small" defaultValue="DH-123" />
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <DatePicker
                                                label="Từ ngày"
                                                value={fromDate}
                                                onChange={setFromDate}
                                                slotProps={{ textField: { size: "small", fullWidth: true } }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <DatePicker
                                                label="Đến ngày"
                                                value={toDate}
                                                onChange={setToDate}
                                                slotProps={{ textField: { size: "small", fullWidth: true } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Button variant="contained" fullWidth sx={{ height: 40 }}>Tìm kiếm</Button>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                {/* CHART bên phải – GIỮ NGUYÊN */}
                                <Grid item xs={12} md={5}>
                                    <Stack alignItems="center">
                                        <Typography fontWeight="bold">Phân bổ thời gian sản xuất</Typography>

                                        <Box sx={{ width: 360, height: 160 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={mockChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={70}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {mockChartData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Box>

                                        <Chip label="Thời gian sản xuất" sx={{ mt: 1 }} />
                                    </Stack>
                                </Grid>
                            </Grid>

                            {/* TABLE CHI TIẾT GIỮ NGUYÊN */}
                            <TableContainerComponent>
                                <Table sx={{ minWidth: 800 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={tableHeaderSx}>TT/Phân xưởng</TableCell>
                                            <TableCell sx={tableHeaderSx}>Tổ</TableCell>
                                            <TableCell sx={tableHeaderSx}>Đơn hàng</TableCell>
                                            <TableCell sx={tableHeaderSx}>Sản phẩm</TableCell>
                                            <TableCell sx={tableHeaderSx}>Itemcode/Công đoạn</TableCell>
                                            <TableCell sx={tableHeaderSx} align="right">Năng suất</TableCell>
                                            <TableCell sx={tableHeaderSx} align="right">Tổng TGC</TableCell>
                                            <TableCell sx={tableHeaderSx} align="right">Hiệu suất</TableCell>
                                            <TableCell sx={tableHeaderSx} align="right">Theo HS</TableCell>
                                            <TableCell sx={tableHeaderSx} align="right">Thừa</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {mockProductionData.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.workshop}</TableCell>
                                                <TableCell>{row.group}</TableCell>
                                                <TableCell>{row.order}</TableCell>
                                                <TableCell>{row.product}</TableCell>
                                                <TableCell>{row.itemCode}</TableCell>
                                                <TableCell align="right">{row.capacity}</TableCell>
                                                <TableCell align="right" sx={{ background: "#f1f8e9", fontWeight: "bold" }}>
                                                    {row.totalTime}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <span style={{
                                                        fontWeight: "bold",
                                                        color:
                                                            row.efficiency >= 100
                                                                ? "green"
                                                                : row.efficiency < 85
                                                                    ? "red"
                                                                    : "inherit"
                                                    }}>
                                                        {row.efficiency}%
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right">{row.effTime}</TableCell>
                                                <TableCell
                                                    align="right"
                                                    style={{
                                                        fontWeight: row.excessTime > 0 ? "bold" : "normal",
                                                        color: row.excessTime > 0 ? "#d32f2f" : "inherit"
                                                    }}
                                                >
                                                    {row.excessTime}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainerComponent>
                        </Paper>
                    )}
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

// Scroll wrapper
const TableContainerComponent = ({ children }) => (
    <Box sx={{ overflowX: "auto", width: "100%" }}>{children}</Box>
);

export default ProductionDashboard;
