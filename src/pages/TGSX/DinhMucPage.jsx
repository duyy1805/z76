import React, { useEffect, useMemo, useState } from "react";
import {
    Paper, Stack, Typography, Button, TextField,
    Table, TableHead, TableRow, TableCell, TableBody,
    Box, CircularProgress, Dialog, DialogTitle,
    DialogContent, DialogActions
} from "@mui/material";
import { apiTGSX } from "../../lib/api_tgsx";

/* ================== CONST ================== */
const weekCols = Array.from({ length: 11 }, (_, i) => i + 1);

const thSx = {
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    color: "#444",
};

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "—";

/* ===== TÍNH TỔNG TG THEO NHÓM ===== */
const calcTongTG = (congDoanList = []) =>
    congDoanList.reduce(
        (acc, cd) => {
            acc.tgTH += Number(cd.TG_DinhMuc_TH || 0);
            acc.tgDC += Number(cd.TG_DieuChinh || 0);
            return acc;
        },
        { tgTH: 0, tgDC: 0 }
    );

/* ================== PAGE ================== */
export default function DinhMucPage() {
    /* ---------- list ---------- */
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    /* ---------- detail ---------- */
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    /* ---------- import / preview ---------- */
    const [importing, setImporting] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    /* ================== FETCH LIST ================== */
    const loadList = async () => {
        setLoading(true);
        try {
            const data = await apiTGSX.listSanPham();
            setRows(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadList();
    }, []);

    /* ================== FILTER ================== */
    const filteredRows = useMemo(() => {
        if (!keyword) return rows;
        const k = keyword.toLowerCase();
        return rows.filter(r =>
            r.TenSanPham?.toLowerCase().includes(k) ||
            r.ItemCode?.toLowerCase().includes(k)
        );
    }, [rows, keyword]);

    /* ================== OPEN DETAIL ================== */
    const openDetail = async (id) => {
        setOpen(true);
        setLoadingDetail(true);
        setDetail(null);
        try {
            const data = await apiTGSX.getSanPhamDetail(id);
            setDetail(data);
        } finally {
            setLoadingDetail(false);
        }
    };

    /* ================== PREVIEW EXCEL ================== */
    const handlePreviewExcel = async (file) => {
        if (!file) return;
        try {
            const data = await apiTGSX.previewExcel(file);
            setPreviewFile(file);
            setPreviewData(data);
            setPreviewOpen(true);
        } catch (err) {
            alert(err?.response?.data?.message || "Preview thất bại");
        }
    };

    /* ================== CONFIRM IMPORT ================== */
    const handleConfirmImport = async () => {
        if (!previewFile) return;
        try {
            setImporting(true);
            await apiTGSX.importExcel(previewFile);
            setPreviewOpen(false);
            setPreviewData(null);
            setPreviewFile(null);
            await loadList();
        } catch (err) {
            alert(err?.response?.data?.message || "Import thất bại");
        } finally {
            setImporting(false);
            setFileInputKey(Date.now());
        }
    };

    const handleExportExcel = async () => {
        const res = await apiTGSX.exportExcel(detail.SanPham.SanPhamId);

        const blob = new Blob([res.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DINH_MUC_${detail.SanPham.ItemCode}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    /* ================== RENDER TABLE DETAIL ================== */
    const renderDetailTable = (data) => (
        <Table size="small" sx={{ minWidth: 1400 }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={thSx}>Tên nguyên công</TableCell>
                    <TableCell sx={thSx}>TG định mức (TH)</TableCell>
                    <TableCell sx={thSx}>TG điều chỉnh</TableCell>
                    {weekCols.map(w => (
                        <TableCell key={w} align="center" sx={thSx}>
                            Tuần {w}
                        </TableCell>
                    ))}
                    <TableCell sx={thSx}>Ghi chú</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.NhomCongDoan.map(nhom => {
                    const { tgTH, tgDC } = calcTongTG(nhom.CongDoan);

                    return (
                        <React.Fragment key={nhom.TenNhom}>
                            {/* GROUP */}
                            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                                <TableCell>
                                    <Typography fontWeight="bold">
                                        {nhom.TenNhom}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight="bold">
                                        {tgTH.toFixed(2)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight="bold">
                                        {tgDC.toFixed(2)}
                                    </Typography>
                                </TableCell>
                                {weekCols.map(w => <TableCell key={w} />)}
                                <TableCell />
                            </TableRow>

                            {/* DETAIL */}
                            {nhom.CongDoan.map(cd => (
                                <TableRow key={cd.CongDoanId || cd.TenCongDoan}>
                                    <TableCell>{cd.TenCongDoan}</TableCell>
                                    <TableCell align="right">{cd.TG_DinhMuc_TH}</TableCell>
                                    <TableCell align="right">{cd.TG_DieuChinh}</TableCell>
                                    {weekCols.map(w => (
                                        <TableCell key={w} align="center">
                                            {cd.HieuSuatTuan?.[w] ?? ""}
                                        </TableCell>
                                    ))}
                                    <TableCell>{cd.GhiChu || ""}</TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );

    /* ================== RENDER ================== */
    return (
        <>
            {/* ================== LIST ================== */}
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                        Danh sách định mức lao động
                    </Typography>

                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined">
                            Danh mục ĐMLĐ
                        </Button>

                        <Button
                            variant="contained"
                            component="label"
                            disabled={importing}
                        >
                            Import Excel
                            <input
                                key={fileInputKey}
                                hidden
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) =>
                                    handlePreviewExcel(e.target.files[0])
                                }
                            />
                        </Button>

                        <TextField
                            size="small"
                            placeholder="Tìm ItemCode / Sản phẩm"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </Stack>
                </Stack>

                <Box sx={{ overflowX: "auto" }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={thSx}>Ngày áp dụng</TableCell>
                                <TableCell sx={thSx}>ItemCode</TableCell>
                                <TableCell sx={thSx}>Sản phẩm</TableCell>
                                <TableCell sx={thSx}>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && filteredRows.map(row => (
                                <TableRow
                                    key={row.SanPhamId}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() => openDetail(row.SanPhamId)}
                                >
                                    <TableCell>{fmtDate(row.NgayApDung)}</TableCell>
                                    <TableCell>{row.ItemCode}</TableCell>
                                    <TableCell>{row.TenSanPham}</TableCell>
                                    <TableCell>
                                        {row.TrangThai
                                            ? <Typography color="green">Đang dùng</Typography>
                                            : <Typography color="gray">Ngừng dùng</Typography>
                                        }
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            {/* ================== DETAIL DIALOG ================== */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle>
                    Định mức – {detail?.SanPham?.ItemCode}
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {loadingDetail
                        ? <Box p={3}><CircularProgress /></Box>
                        : detail && renderDetailTable(detail)
                    }
                </DialogContent>
                {detail && (
                    <DialogActions>
                        <Button variant="outlined" onClick={handleExportExcel}>
                            Export Excel
                        </Button>
                        <Button onClick={() => setOpen(false)}>Đóng</Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* ================== PREVIEW DIALOG ================== */}
            <Dialog open={previewOpen} maxWidth="xl" fullWidth>
                <DialogTitle>
                    Preview import – {previewData?.SanPham?.ItemCode}
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {previewData && renderDetailTable(previewData)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>
                        Huỷ
                    </Button>
                    <Button
                        variant="contained"
                        disabled={importing}
                        onClick={handleConfirmImport}
                    >
                        {importing ? "Đang import..." : "Xác nhận import"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
