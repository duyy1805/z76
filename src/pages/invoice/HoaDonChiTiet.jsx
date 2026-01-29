import React, { useState } from "react";
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
    Box
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
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
    if (!r.tenHangHoa?.trim()) return false;
    if (!r.donViTinh?.trim()) return false;
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
    tenHangHoa: "",
    donViTinh: "",
    soLuong: 1,
    donGia: "", // Để string rỗng để placeholder hoạt động
    vat: 0,
};

/* ================= 2. CSS STYLES ================= */

// Style cắt chữ khi số quá dài (Text Ellipsis)
const ellipsisStyle = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%' // Sẽ theo width của TableCell
};

/* ================= 3. MAIN COMPONENT ================= */

export default function HoaDonChiTiet({ hoaDonId, rows, locked, onReload }) {
    const [draftRows, setDraftRows] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState(null);
    const isAdding = draftRows.length > 0;
    const isEditing = editingId !== null;

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
            alert(`Dòng ${invalidIndex + 1} chưa nhập đủ thông tin`);
            return;
        }

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
    };


    /* --- EDIT ROW LOGIC --- */
    const startEdit = (r) => {
        setEditingId(r.hoaDonChiTietId);
        setEditDraft({
            ...r,
            donGia: formatDecimalVN(r.donGia) // Convert số DB -> chuỗi hiển thị input
        });
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
        if (!isValidRow(editDraft)) {
            alert("Vui lòng nhập đủ thông tin trước khi lưu");
            return;
        }

        const payload = {
            ...editDraft,
            donGia: parseDecimalVN(editDraft.donGia)
        };

        await apiInvoice.updateChiTiet(editDraft.hoaDonChiTietId, payload);
        setEditingId(null);
        setEditDraft(null);
        await onReload();
    };

    const removeRow = async (id) => {
        if (!window.confirm("Xóa dòng này?")) return;
        await apiInvoice.deleteChiTiet(id);
        await onReload();
    };

    /* --- RENDER --- */
    return (
        <Box>
            {/* Toolbar Buttons */}
            {!locked && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Button
                        startIcon={<AddIcon />}
                        disabled={locked || isEditing}
                        onClick={addDraftRow}
                    >
                        Thêm dòng
                    </Button>
                    {draftRows.length > 0 && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<SaveIcon />}
                            disabled={draftRows.some(r => !isValidRow(r))}
                            onClick={saveAllDrafts}
                        >
                            Lưu
                        </Button>
                    )}
                </Stack>
            )}

            {locked && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Hóa đơn đã trình, không thể chỉnh sửa chi tiết
                </Typography>
            )}

            {/* Wrapper Table để có thanh cuộn ngang (overflow-x) */}
            <Box sx={{ overflowX: 'auto', width: '100%', border: '1px solid #eee' }}>
                <Table size="small" sx={{ minWidth: 1000 }}>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                            <TableCell sx={{ minWidth: 200 }}>Hàng hóa</TableCell>
                            <TableCell align="center" sx={{ width: 80 }}>ĐVT</TableCell>
                            <TableCell align="right" sx={{ width: 80 }}>SL</TableCell>
                            <TableCell align="right" sx={{ width: 160 }}>Đơn giá</TableCell>
                            <TableCell align="right" sx={{ width: 150 }}>Tiền hàng</TableCell>
                            <TableCell align="right" sx={{ width: 70 }}>VAT</TableCell>
                            <TableCell align="right" sx={{ width: 160 }}>Thành tiền</TableCell>
                            <TableCell align="center" sx={{ width: 80, position: 'sticky', right: 0, bgcolor: '#f9fafb' }}>
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
                                <TableRow key={r.__key}>
                                    <TableCell>
                                        <TextField
                                            size="small" fullWidth placeholder="Tên hàng..."
                                            value={r.tenHangHoa}
                                            onChange={(e) => handleDraftChange(idx, "tenHangHoa", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" value={r.donViTinh}
                                            onChange={(e) => handleDraftChange(idx, "donViTinh", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" value={r.soLuong}
                                            onChange={(e) => handleDraftChange(idx, "soLuong", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" fullWidth value={r.donGia}
                                            onChange={(e) => handleDraftChange(idx, "donGia", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                            placeholder="0"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={fmtMoney(tienHang)}>
                                            <span style={ellipsisStyle}>{fmtMoney(tienHang)}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small" value={r.vat}
                                            onChange={(e) => handleDraftChange(idx, "vat", e.target.value)}
                                            inputProps={{ style: { textAlign: "right" } }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={fmtMoney(tienSauThue)}>
                                            <span style={{ ...ellipsisStyle, fontWeight: 'bold' }}>{fmtMoney(tienSauThue)}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: 'white' }}>
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
                                <TableRow key={r.hoaDonChiTietId}>
                                    <TableCell sx={{ maxWidth: 200 }}>
                                        <Tooltip title={r.tenHangHoa}>
                                            <span style={ellipsisStyle}>{r.tenHangHoa}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center">{r.donViTinh}</TableCell>
                                    <TableCell align="right">{formatIntVN(r.soLuong)}</TableCell>
                                    <TableCell align="right">{formatDecimalVN(r.donGia)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={fmtMoney(r.soLuong * r.donGia)}>
                                            <span style={ellipsisStyle}>{fmtMoney(r.soLuong * r.donGia)}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right">{r.vat}%</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={fmtMoney(r.soLuong * r.donGia * (1 + r.vat / 100))}>
                                            <span style={{ ...ellipsisStyle, fontWeight: 'bold' }}>
                                                {fmtMoney(r.soLuong * r.donGia * (1 + r.vat / 100))}
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: 'white' }}>
                                        {!locked && (
                                            <Stack direction="row" spacing={0} justifyContent="center">
                                                <IconButton
                                                    size="small"
                                                    disabled={isAdding}
                                                    onClick={() => startEdit(r)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={isAdding}
                                                    onClick={() => removeRow(r.hoaDonChiTietId)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
}

/* ================= 4. SUB COMPONENT: EDIT ROW ================= */

function EditRow({ draft, onChange, onSave, onCancel }) {
    // Tính toán real-time
    const donGiaNum = parseDecimalVN(draft.donGia);
    const tienHang = draft.soLuong * donGiaNum;
    const tienSauThue = tienHang * (1 + draft.vat / 100);

    return (
        <TableRow>
            <TableCell>
                <TextField
                    size="small" fullWidth value={draft.tenHangHoa}
                    onChange={(e) => onChange("tenHangHoa", e.target.value)}
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small" value={draft.donViTinh}
                    onChange={(e) => onChange("donViTinh", e.target.value)}
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small" value={draft.soLuong}
                    onChange={(e) => onChange("soLuong", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small" fullWidth value={draft.donGia}
                    onChange={(e) => onChange("donGia", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                />
            </TableCell>
            <TableCell align="right">
                <Tooltip title={fmtMoney(tienHang)}>
                    <span style={ellipsisStyle}>{fmtMoney(tienHang)}</span>
                </Tooltip>
            </TableCell>
            <TableCell>
                <TextField
                    size="small" value={draft.vat}
                    onChange={(e) => onChange("vat", e.target.value)}
                    inputProps={{ style: { textAlign: "right" } }}
                />
            </TableCell>
            <TableCell align="right">
                <Tooltip title={fmtMoney(tienSauThue)}>
                    <span style={ellipsisStyle}>{fmtMoney(tienSauThue)}</span>
                </Tooltip>
            </TableCell>
            <TableCell align="center" sx={{ position: 'sticky', right: 0, bgcolor: 'white' }}>
                <Stack direction="row" spacing={0} justifyContent="center">
                    <IconButton size="small" color="success" onClick={onSave}>
                        <SaveIcon />
                    </IconButton>
                    <IconButton size="small" onClick={onCancel}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </TableCell>
        </TableRow>
    );
}   