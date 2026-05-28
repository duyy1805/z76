import React, { useState, useEffect, useMemo } from "react";
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    TextField,
    Button,
    Stack,
    Typography,
    Tooltip,
    Box,
    Paper,
    Card,
    CardContent,
    TableContainer,
    TableFooter,
    Divider,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import Autocomplete from "@mui/material/Autocomplete";
import { apiInvoice } from "../../lib/api_invoice";

/* ================= 1. HELPERS & FORMATTING ================= */

// Chuyển chuỗi/số bất kỳ thành số thực để tính toán
// VD: "10.000,50" -> 10000.5
const parseDecimalVN = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;

    // Xóa dấu chấm (ngàn), thay phẩy (thập phân) bằng chấm
    const cleaned = String(val).replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
};

// Format số thực thành chuỗi hiển thị (Read-only)
// VD: 10000.5 -> "10.000,5"
const formatDecimalVN = (val) =>
    val === null || val === undefined
        ? ""
        : Number(val).toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        });
const isValidRow = (r) => {
    if (!r.hangHoaId) return false;
    if (!r.soLuong || r.soLuong <= 0) return false;
    if (parseDecimalVN(r.donGia) <= 0) return false;
    if (r.vat < 0 || r.vat > 100) return false;
    return true;
};
// Format số nguyên hiển thị
const formatIntVN = (val) =>
    val === null || val === undefined
        ? ""
        : Number(val).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

// Format tiền tệ cho Tooltip và hiển thị bảng
const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });

// Parse số nguyên không âm (cho SL, VAT)
const parseIntNonNegative = (val) => {
    if (!val) return 0;
    const n = parseInt(String(val).replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n;
};

// INPUT HANDLER: Giữ format khi đang gõ (quan trọng để nhập số thập phân)
const formatInputMoney = (val) => {
    if (!val) return "";

    // 1. Chỉ giữ số và dấu phẩy
    let clean = String(val).replace(/[^0-9,]/g, "");

    // 2. Tách phần nguyên và thập phân
    const parts = clean.split(",");
    let integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join("") : null;

    // 3. Xử lý số 0 ở đầu (01 -> 1)
    if (integerPart.length > 1 && integerPart.startsWith("0")) {
        integerPart = integerPart.substring(1);
    }

    // 4. Thêm dấu chấm phân cách ngàn
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // 5. Trả về kết quả (bảo toàn dấu phẩy user đang gõ)
    if (decimalPart !== null) {
        return `${integerPart},${decimalPart}`;
    } else {
        return clean.endsWith(",") ? `${integerPart},` : integerPart;
    }
};

const emptyRow = {
    hangHoaId: null,
    itemCode: "",
    donViTinh: "",
    soLuong: 1,
    donGia: "",
    vat: 0,
};

/* ================= 2. CSS STYLES ================= */

// Style cắt chữ khi số quá dài (Text Ellipsis)


/* ================= 3. MAIN COMPONENT ================= */

export default function HoaDonChiTiet({ hoaDonId, rows, locked, onReload }) {
    const [draftRows, setDraftRows] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState(null);
    // ===== HÀNG HÓA =====
    const [hangHoaList, setHangHoaList] = useState([]);
    // const [hhInput, setHhInput] = useState("");

    // dialog thêm hàng hóa
    const [openAddHH, setOpenAddHH] = useState(false);
    const [hhMa, setHhMa] = useState("");
    const [hhTen, setHhTen] = useState("");
    const [hhDvt, setHhDvt] = useState("");
    const [savingHH, setSavingHH] = useState(false);

    const [toast, setToast] = useState({
        open: false,
        message: "",
        severity: "success", // success | error | warning | info
    });

    const showToast = (message, severity = "success") => {
        setToast({ open: true, message, severity });
    };

    const isAdding = draftRows.length > 0;
    const isEditing = editingId !== null;


    useEffect(() => {
        apiInvoice
            .listHangHoa({ tonTai: 1 })
            .then(setHangHoaList)
            .catch(() => console.error("Lỗi tải hàng hóa"));
    }, []);

    /* --- ADD NEW ROW LOGIC --- */
    const addDraftRow = () => {
        setDraftRows((list) => [
            ...list,
            { ...emptyRow, __key: Date.now() + Math.random() },
        ]);
    };

    const handleDraftChange = (idx, field, value) => {
        // Validation: Chặn nhập quá dài làm vỡ UI
        if ((field === 'donGia' || field === 'soLuong') && String(value).length > 15) return;

        let finalVal = value;
        if (field === "donGia") {
            finalVal = formatInputMoney(value);
        } else if (field === "soLuong") {
            finalVal = parseIntNonNegative(value);
        } else if (field === "vat") {
            finalVal = parseIntNonNegative(value);
            if (finalVal > 100) finalVal = 100;
        }

        setDraftRows((list) =>
            list.map((r, i) => (i === idx ? { ...r, [field]: finalVal } : r))
        );
    };

    const removeDraft = (idx) => {
        setDraftRows((list) => list.filter((_, i) => i !== idx));
    };

    const saveAllDrafts = async () => {
        const invalidIndex = draftRows.findIndex(r => !isValidRow(r));
        if (invalidIndex !== -1) {
            showToast(`Dòng ${invalidIndex + 1} chưa nhập đủ thông tin`, "warning");
            return;
        }

        try {
            for (const r of draftRows) {
                const payload = {
                    ...r,
                    donGia: parseDecimalVN(r.donGia)
                };
                delete payload.__key;
                await apiInvoice.addChiTiet(hoaDonId, payload);
            }

            setDraftRows([]);
            await onReload();
            showToast("Lưu chi tiết hóa đơn thành công");
        } catch (err) {
            console.error(err);
            showToast("Lỗi khi lưu chi tiết hóa đơn", "error");
        }
    };


    /* --- EDIT ROW LOGIC --- */
    const startEdit = (r) => {
        setEditingId(r.hoaDonChiTietId);
        setEditDraft({
            ...r,
            hangHoaId: 1,
            donGia: formatDecimalVN(r.donGia) // Convert số DB -> chuỗi hiển thị input
        });
        console.log(r);
    };

    const handleEditChange = (field, value) => {
        if ((field === 'donGia' || field === 'soLuong') && String(value).length > 15) return;

        let finalVal = value;
        if (field === "donGia") finalVal = formatInputMoney(value);
        else if (field === "soLuong") finalVal = parseIntNonNegative(value);
        else if (field === "vat") {
            finalVal = parseIntNonNegative(value);
            if (finalVal > 100) finalVal = 100;
        }

        setEditDraft({ ...editDraft, [field]: finalVal });
    };

    const saveEdit = async () => {
        try {
            if (!isValidRow(editDraft)) {
                console.log(editDraft);
                showToast("Dòng chưa nhập đủ thông tin", "warning");
                return;
            }
            const payload = {
                hangHoaId: editDraft.hangHoaId,
                soLuong: editDraft.soLuong,
                donGia: parseDecimalVN(editDraft.donGia),
                vat: editDraft.vat
            };

            await apiInvoice.updateChiTiet(editDraft.hoaDonChiTietId, payload);

            setEditingId(null);
            setEditDraft(null);
            await onReload();
            showToast("Cập nhật dòng thành công");
        } catch (err) {
            console.error(err);
            showToast("Không thể cập nhật dòng", "error");
        }
    };

    const removeRow = async (id) => {
        if (!window.confirm("Xóa dòng này?")) return;

        try {
            await apiInvoice.deleteChiTiet(id);
            await onReload();
            showToast("Đã xóa dòng");
        } catch (err) {
            console.error(err);
            showToast("Xóa dòng thất bại", "error");
        }
    };

    /* --- RENDER --- */
    // Calculate Total for display
    const totalAmount = useMemo(() => {
        return rows.reduce((acc, r) => {
            const val = r.soLuong * r.donGia * (1 + r.vat / 100);
            return acc + val;
        }, 0);
    }, [rows]);

    return (
        <Card variant="outlined" sx={{ border: "none", boxShadow: "none" }}>
            <Box sx={{ mb: 2, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary">
                    Danh sách hàng hóa & dịch vụ
                </Typography>
                {!locked && (
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            disabled={locked || isEditing}
                            onClick={addDraftRow}
                            size="small"
                        >
                            Thêm dòng
                        </Button>
                        {draftRows.length > 0 && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                                disabled={draftRows.some(r => !isValidRow(r))}
                                onClick={saveAllDrafts}
                                size="small"
                            >
                                Lưu ({draftRows.length})
                            </Button>
                        )}
                    </Stack>
                )}
            </Box>

            {locked && (
                <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                    Hóa đơn đã trình hoặc đã hoàn thành, không thể chỉnh sửa chi tiết.
                </Alert>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2 }}>
                <Table size="small" sx={{ minWidth: 1000 }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#eff6ff" }}>
                            <TableCell
                                align="center"
                                sx={{ fontWeight: 700, width: 120, color: "#1e3a8a" }}
                            >
                                ItemCode
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 200, color: "#1e3a8a" }}>Hàng hóa / Dịch vụ</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, width: 80, color: "#1e3a8a" }}>ĐVT</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, width: 90, color: "#1e3a8a" }}>Số lượng</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, width: 140, color: "#1e3a8a" }}>Đơn giá</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, width: 140, color: "#1e3a8a" }}>Thành tiền</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, width: 70, color: "#1e3a8a" }}>VAT(%)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, width: 150, color: "#1e3a8a" }}>Tổng cộng</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, width: 90, position: 'sticky', right: 0, bgcolor: '#eff6ff', color: "#1e3a8a" }}>
                                Thao tác
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {/* 1. DRAFT ROWS */}
                        {draftRows.map((r, idx) => {
                            const donGiaNum = parseDecimalVN(r.donGia);
                            const tienHang = r.soLuong * donGiaNum;
                            const tienSauThue = tienHang * (1 + r.vat / 100);

                            return (
                                <TableRow key={r.__key} sx={{ bgcolor: "#fffcf0" }}>
                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {r.itemCode || "-"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>

                                            <Autocomplete
                                                fullWidth
                                                options={hangHoaList}
                                                value={
                                                    hangHoaList.find(h => h.id === r.hangHoaId) || null
                                                }
                                                onChange={(_, v) => {
                                                    setDraftRows(list =>
                                                        list.map((row, i) =>
                                                            i === idx
                                                                ? {
                                                                    ...row,
                                                                    hangHoaId: v?.id ?? null,
                                                                    itemCode: v?.itemCode ?? "",
                                                                    donViTinh: v?.donViTinh ?? ""
                                                                }
                                                                : row
                                                        )
                                                    );
                                                }}
                                                getOptionLabel={(option) => option?.tenHangHoa || ""}
                                                isOptionEqualToValue={(option, value) =>
                                                    option.id === value.id
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size="small"
                                                        placeholder="Chọn hàng hóa"
                                                    />
                                                )}
                                            />

                                            <IconButton onClick={() => setOpenAddHH(true)}>
                                                <AddIcon />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        {r.donViTinh}
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" value={r.soLuong}
                                            onChange={(e) => handleDraftChange(idx, "soLuong", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                            variant="outlined"
                                            sx={{ bgcolor: "white" }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" fullWidth value={r.donGia}
                                            onChange={(e) => handleDraftChange(idx, "donGia", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                            placeholder="0"
                                            variant="outlined"
                                            sx={{ bgcolor: "white" }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="text.secondary">
                                            {fmtMoney(tienHang)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" value={r.vat}
                                            onChange={(e) => handleDraftChange(idx, "vat", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                            variant="outlined"
                                            sx={{ bgcolor: "white" }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold">
                                            {fmtMoney(tienSauThue)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: '#fffcf0' }}>
                                        <IconButton color="error" size="small" onClick={() => removeDraft(idx)}>
                                            <CloseIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {/* 2. EXISTING ROWS */}
                        {rows.map((r) =>
                            editingId === r.hoaDonChiTietId ? (
                                <EditRow
                                    key={r.hoaDonChiTietId}
                                    draft={editDraft}
                                    onChange={handleEditChange}
                                    onSave={saveEdit}
                                    onCancel={() => { setEditingId(null); setEditDraft(null); }}
                                />
                            ) : (
                                <TableRow key={r.hoaDonChiTietId} hover>
                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {r.itemCode || "-"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200 }}>
                                        <Typography variant="body2" fontWeight={500}>
                                            {r.tenHangHoa}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">{r.donViTinh}</TableCell>
                                    <TableCell align="right">{formatIntVN(r.soLuong)}</TableCell>
                                    <TableCell align="right">{formatDecimalVN(r.donGia)}</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="text.secondary">
                                            {fmtMoney(r.soLuong * r.donGia)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{r.vat}%</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={700} color="primary.main">
                                            {fmtMoney(r.soLuong * r.donGia * (1 + r.vat / 100))}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: 'white' }}>
                                        {!locked && (
                                            <Stack direction="row" spacing={0} justifyContent="center">
                                                <Tooltip title="Sửa">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        disabled={isAdding}
                                                        onClick={() => startEdit(r)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={isAdding}
                                                        onClick={() => removeRow(r.hoaDonChiTietId)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                        {rows.length === 0 && draftRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        Chưa có chi tiết nào. Nhấn "Thêm dòng" để bắt đầu.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                    {/* FOOTER SUMMARY */}
                    {rows.length > 0 && (
                        <TableFooter>
                            <TableRow sx={{ bgcolor: "#fafafa" }}>
                                <TableCell colSpan={7} align="right">
                                    <Typography variant="subtitle2">Tổng cộng tiền hàng (sau thuế):</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="subtitle1" fontWeight={700} color="primary">
                                        {fmtMoney(totalAmount)}
                                    </Typography>
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
            {/* ADD HÀNG HÓA */}
            <Dialog open={openAddHH} onClose={() => setOpenAddHH(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Thêm hàng hóa</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField label="Mã hàng hóa" value={hhMa} onChange={e => setHhMa(e.target.value)} />
                        <TextField label="Tên hàng hóa" value={hhTen} onChange={e => setHhTen(e.target.value)} />
                        <TextField label="Đơn vị tính" value={hhDvt} onChange={e => setHhDvt(e.target.value)} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddHH(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        disabled={savingHH}
                        onClick={async () => {
                            try {
                                setSavingHH(true);
                                const created = await apiInvoice.createHangHoa({
                                    maHangHoa: hhMa,
                                    tenHangHoa: hhTen,
                                    donViTinh: hhDvt
                                });
                                setHangHoaList(l => [...l, created]);
                                setOpenAddHH(false);
                                showToast("Thêm hàng hóa thành công");
                            } catch (err) {
                                console.error(err);
                                showToast("Không thể thêm hàng hóa", "error");
                            } finally {
                                setSavingHH(false);
                            }
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast(t => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    severity={toast.severity}
                    variant="filled"
                    onClose={() => setToast(t => ({ ...t, open: false }))}
                >
                    {toast.message}
                </Alert>
            </Snackbar>

        </Card>
    );
}

/* ================= 4. SUB COMPONENT: EDIT ROW ================= */

function EditRow({ draft, onChange, onSave, onCancel }) {
    // Tính toán real-time
    const donGiaNum = parseDecimalVN(draft.donGia);
    const tienHang = draft.soLuong * donGiaNum;
    const tienSauThue = tienHang * (1 + draft.vat / 100);

    return (
        <TableRow sx={{ bgcolor: "#f0f9ff" }}>
            <TableCell align="center">
                <Typography variant="body2">
                    {draft.itemCode}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" fontWeight={500}>
                    {draft.tenHangHoa}
                </Typography>
            </TableCell>

            <TableCell align="center">
                {draft.donViTinh}
            </TableCell>
            <TableCell>
                <TextField
                    size="small" value={draft.soLuong}
                    onChange={(e) => onChange("soLuong", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                    variant="outlined"
                    sx={{ bgcolor: "white" }}
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small" fullWidth value={draft.donGia}
                    onChange={(e) => onChange("donGia", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                    variant="outlined"
                    sx={{ bgcolor: "white" }}
                />
            </TableCell>
            <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{fmtMoney(tienHang)}</Typography>
            </TableCell>
            <TableCell>
                <TextField
                    size="small" value={draft.vat}
                    onChange={(e) => onChange("vat", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                    variant="outlined"
                    sx={{ bgcolor: "white" }}
                />
            </TableCell>
            <TableCell align="right">
                <Typography variant="body2" fontWeight="bold">{fmtMoney(tienSauThue)}</Typography>
            </TableCell>
            <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: '#f0f9ff' }}>
                <Stack direction="row" spacing={0} justifyContent="center">
                    <Tooltip title="Lưu lại">
                        <IconButton size="small" color="success" onClick={onSave}>
                            <SaveIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hủy bỏ">
                        <IconButton size="small" onClick={onCancel} color="error">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
}   