import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";

export default function Checkbooks() {
    const rows = [
        { id: 1, bank: "Vietcombank", account: "00123456789", seriFrom: 1000, seriTo: 1100, seriCurrent: 1006, status: "Đang sử dụng" },
    ];
    return (
        <Box>
            <Typography variant="h5" gutterBottom>Sổ séc</Typography>
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Ngân hàng</TableCell>
                            <TableCell>Số tài khoản</TableCell>
                            <TableCell align="right">Seri</TableCell>
                            <TableCell align="right">Hiện tại</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>{r.bank}</TableCell>
                                <TableCell>{r.account}</TableCell>
                                <TableCell align="right">{r.seriFrom} - {r.seriTo}</TableCell>
                                <TableCell align="right">{r.seriCurrent}</TableCell>
                                <TableCell>{r.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
