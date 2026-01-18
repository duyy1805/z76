import React, { useState } from "react";
import {
    Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, TextField, Button, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { apiInvoice } from "../../lib/api_invoice";

const emptyRow = {
    tenHangHoa: "",
    donViTinh: "",
    soLuong: 1,
    donGia: 0,
    vat: 0,
};
const fmtMoney = (n) =>
    (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 4 });

export default function HoaDonChiTiet({ hoaDonId, rows, locked, onReload }) {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState(emptyRow);
    const [adding, setAdding] = useState(false);

    const startAdd = () => {
        setDraft(emptyRow);
        setAdding(true);
    };

    const startEdit = (r) => {
        setEditingId(r.hoaDonChiTietId);
        setDraft({ ...r });
    };

    const cancel = () => {
        setAdding(false);
        setEditingId(null);
        setDraft(emptyRow);
    };

    const saveAdd = async () => {
        await apiInvoice.addChiTiet(hoaDonId, draft);
        cancel();
        onReload();
    };

    const saveEdit = async () => {
        await apiInvoice.updateChiTiet(draft.hoaDonChiTietId, draft);
        cancel();
        onReload();
    };

    const remove = async (id) => {
        if (!window.confirm("Xóa dòng này?")) return;
        await apiInvoice.deleteChiTiet(id);
        onReload();
    };

    const bind = (k) => ({
        value: draft[k],
        onChange: (e) => setDraft({ ...draft, [k]: e.target.value }),
    });

    return (
        <>
            {!locked && !adding && (
                <Button startIcon={<AddIcon />} sx={{ mb: 1 }} onClick={startAdd}>
                    Thêm dòng
                </Button>
            )}

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Hàng hóa</TableCell>
                        <TableCell align="center">ĐVT</TableCell>
                        <TableCell align="right">SL</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                        <TableCell align="right">VAT (%)</TableCell>
                        <TableCell align="right">Thành tiền sau VAT</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {adding && (
                        <EditRow
                            draft={draft}
                            bind={bind}
                            onSave={saveAdd}
                            onCancel={cancel}
                        />
                    )}

                    {rows.map((r) =>
                        editingId === r.hoaDonChiTietId ? (
                            <EditRow
                                key={r.hoaDonChiTietId}
                                draft={draft}
                                bind={bind}
                                onSave={saveEdit}
                                onCancel={cancel}
                            />
                        ) : (
                            <TableRow key={r.hoaDonChiTietId}>
                                <TableCell>{r.tenHangHoa}</TableCell>
                                <TableCell align="center">{r.donViTinh}</TableCell>
                                <TableCell align="right">{r.soLuong}</TableCell>
                                <TableCell align="right">{fmtMoney(r.donGia)}</TableCell>

                                {/* Thành tiền trước VAT */}
                                <TableCell align="right">
                                    {fmtMoney(r.soLuong * r.donGia)}
                                </TableCell>

                                <TableCell align="right">{r.vat}</TableCell>

                                {/* Thành tiền sau VAT */}
                                <TableCell align="right">
                                    {fmtMoney(
                                        r.soLuong * r.donGia +
                                        (r.soLuong * r.donGia * (r.vat || 0)) / 100
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    {!locked && (
                                        <>
                                            <IconButton onClick={() => startEdit(r)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => remove(r.hoaDonChiTietId)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
        </>
    );
}

function EditRow({ draft, bind, onSave, onCancel }) {
    const thanhTienTruocVAT = draft.soLuong * draft.donGia;
    const thanhTienSauVAT =
        thanhTienTruocVAT + (thanhTienTruocVAT * (draft.vat || 0)) / 100;

    return (
        <TableRow>
            <TableCell>
                <TextField size="small" {...bind("tenHangHoa")} />
            </TableCell>
            <TableCell>
                <TextField size="small" {...bind("donViTinh")} />
            </TableCell>
            <TableCell>
                <TextField size="small" type="number" {...bind("soLuong")} />
            </TableCell>
            <TableCell>
                <TextField size="small" type="number" {...bind("donGia")} />
            </TableCell>

            {/* Thành tiền trước VAT */}
            <TableCell align="right">
                {fmtMoney(thanhTienTruocVAT)}
            </TableCell>

            <TableCell>
                <TextField size="small" type="number" {...bind("vat")} />
            </TableCell>

            {/* Thành tiền sau VAT */}
            <TableCell align="right">
                {fmtMoney(thanhTienSauVAT)}
            </TableCell>

            <TableCell align="center">
                <IconButton color="success" onClick={onSave}>
                    <SaveIcon />
                </IconButton>
                <IconButton onClick={onCancel}>
                    <CloseIcon />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

