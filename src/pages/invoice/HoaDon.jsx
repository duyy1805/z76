import React, { useEffect, useState } from "react";
import {
    Box, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Stack, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Snackbar, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import StatusChip from "../../components/StatusChip";
import HoaDonChiTiet from "./HoaDonChiTiet";
import { apiInvoice } from "../../lib/api_invoice";
import { useAuth } from "../../store/useAuth";

const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export default function HoaDon() {
    const { role, user } = useAuth();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);

    const [detail, setDetail] = useState(null);
    const [items, setItems] = useState([]);

    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const [form, setForm] = useState({
        congTyId: "",
        ghiChu: "",
    });

    /* ================= LOAD LIST ================= */
    const load = async () => {
        try {
            setLoading(true);
            const data = await apiInvoice.listHoaDon({
                userId: user?.id,
                roleCode: role,
                idDonVi: user?.idDonVi,
            });
            setRows(data || []);
            console.log("Loaded invoices:", data);
        } catch {
            setToast({ open: true, msg: "Lỗi tải danh sách hóa đơn", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, []);

    /* ================= DUYỆT ================= */
    const canApprove = (r) =>
        (role === "TBP" && r.maTrangThai === "ChoDuyet_TBP") ||
        (role === "KTT" && r.maTrangThai === "ChoDuyet_KTT") ||
        (role === "GD" && r.maTrangThai === "ChoDuyet_GD");

    const handleApprove = async (row, agree, e) => {
        e.stopPropagation();
        try {
            const updated = await apiInvoice.approveHoaDon(row.hoaDonId, {
                nguoiDuyetId: user.id,
                chapThuan: agree,
                requesterUserId: user.id,
                requesterRoleCode: role,
                requesterIdDonVi: user.idDonVi,
            });

            setRows((r) =>
                r.map((x) => (x.hoaDonId === updated.hoaDonId ? updated : x))
            );
            setDetail((d) =>
                d && d.hoaDonId === updated.hoaDonId ? updated : d
            );

            setToast({
                open: true,
                msg: agree ? "Đã duyệt hóa đơn" : "Đã từ chối hóa đơn",
                type: "success",
            });
        } catch {
            setToast({ open: true, msg: "Duyệt thất bại", type: "error" });
        }
    };

    /* ================= CREATE ================= */
    const submitCreate = async () => {
        try {
            if (!form.congTyId) throw new Error("Chưa chọn công ty");

            await apiInvoice.createHoaDon({
                ngayDangKy: new Date().toISOString().slice(0, 10),
                congTyId: form.congTyId,
                nguoiDangKyId: user.id,
                donViNguoiDangKyId: user.idDonVi,
                ghiChu: form.ghiChu,
            });

            setOpenCreate(false);
            setForm({ congTyId: "", ghiChu: "" });
            await load();

            setToast({ open: true, msg: "Đã tạo hóa đơn", type: "success" });
        } catch (e) {
            setToast({
                open: true,
                msg: e.message || "Lỗi tạo hóa đơn",
                type: "error",
            });
        }
    };

    /* ================= DETAIL ================= */
    const openDetailDialog = async (row) => {
        setDetail(row);
        setOpenDetail(true);
        const list = await apiInvoice.getChiTiet(row.hoaDonId);
        setItems(list || []);
    };

    return (
        <Box>
            {/* HEADER */}
            <Stack direction="row" justifyContent="space-between" mb={2}>
                <Typography variant="h5">Hóa đơn</Typography>
                <Stack direction="row" spacing={1}>
                    <Button startIcon={<RefreshIcon />} onClick={load}>
                        Tải lại
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
                        Tạo hóa đơn
                    </Button>
                </Stack>
            </Stack>

            {/* TABLE */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">STT</TableCell>
                            <TableCell align="center">Mã</TableCell>
                            <TableCell align="center">Ngày</TableCell>
                            <TableCell>Công ty</TableCell>
                            <TableCell align="right">Tổng tiền</TableCell>
                            <TableCell align="center">Trạng thái</TableCell>
                            <TableCell align="center">Duyệt</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((r, i) => (
                            <TableRow
                                key={r.hoaDonId}
                                hover
                                sx={{ cursor: "pointer" }}
                                onClick={() => openDetailDialog(r)}
                            >
                                <TableCell align="center">{i + 1}</TableCell>
                                <TableCell>{r.maHoaDon}</TableCell>
                                <TableCell align="center">{r.ngayDangKy}</TableCell>
                                <TableCell>{r.tenCongTy}</TableCell>
                                <TableCell align="right">{fmtMoney(r.tongThanhTien)}</TableCell>
                                <TableCell align="center">
                                    <StatusChip status={r.maTrangThai} />
                                </TableCell>
                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                    <IconButton
                                        color="success"
                                        disabled={!canApprove(r)}
                                        onClick={(e) => handleApprove(r, true, e)}
                                    >
                                        <CheckCircleIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        disabled={!canApprove(r)}
                                        onClick={(e) => handleApprove(r, false, e)}
                                    >
                                        <CancelIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography align="center" color="text.secondary">
                                        Không có hóa đơn
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>

            {/* CREATE DIALOG */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
                <DialogTitle>Tạo hóa đơn</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Công ty (ID)"
                            value={form.congTyId}
                            onChange={(e) => setForm({ ...form, congTyId: e.target.value })}
                        />
                        <TextField
                            label="Ghi chú"
                            value={form.ghiChu}
                            onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>Đóng</Button>
                    <Button variant="contained" onClick={submitCreate}>
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DETAIL DIALOG */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="lg" fullWidth>
                {detail && (
                    <>
                        <DialogTitle>Chi tiết hóa đơn {detail.maHoaDon}</DialogTitle>
                        <DialogContent>
                            <HoaDonChiTiet
                                hoaDonId={detail.hoaDonId}
                                rows={items}
                                locked={detail.maTrangThai !== "ChoDuyet_TBP"}
                                onReload={async () => {
                                    const list = await apiInvoice.getChiTiet(detail.hoaDonId);
                                    setItems(list);
                                    await apiInvoice.saveHoaDon(detail.hoaDonId);
                                    await load();
                                }}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert severity={toast.type} variant="filled">
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
