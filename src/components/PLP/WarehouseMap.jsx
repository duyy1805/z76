import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Paper, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Chip, IconButton, Card, CardContent, Grid
} from '@mui/material';
import {
    Close, Logout, QrCodeScanner, FactCheck, Inventory,
    Assessment, // Icon cho nút Tổng kết
    LocalShipping // Icon trang trí
} from '@mui/icons-material';

// --- 1. CẤU HÌNH KÍCH THƯỚC ---
const SLOT_WIDTH = 26;
const SLOT_HEIGHT = 15;
const COL_FULL_WIDTH = SLOT_WIDTH + 1;

const THEME = {
    rackBg: '#fff',
    rackBorder: '#b0bec5',
    selected: '#ff9800',
    zoneYellow: '#ffeb3b',
    wallBorder: '2px solid #000',
};

// --- 2. HÀM HEATMAP ---
const getSlotColor = (percentage) => {
    if (!percentage || percentage <= 0) return '#ffffff';
    if (percentage >= 100) return '#d32f2f';
    if (percentage <= 25) return '#e3f2fd';
    if (percentage <= 50) return '#64b5f6';
    if (percentage <= 75) return '#66bb6a';
    return '#ffa726';
};

const getTextColor = (percentage) => {
    if (!percentage || percentage <= 0) return '#37474f';
    if (percentage <= 25) return '#0d47a1';
    return '#ffffff';
};

// --- 3. LOGIC CẤU HÌNH HÀNG KỆ ---
const getRowConfig = (rowLabel) => {
    if (rowLabel === 'A') {
        return {
            type: 'split',
            left: Array.from({ length: 38 }, (_, i) => 51 - i),
            right: Array.from({ length: 13 }, (_, i) => 13 - i),
            spacer: 1, spacerLabel: ''
        };
    }
    if (rowLabel === 'I') {
        return {
            type: 'split',
            left: Array.from({ length: 26 }, (_, i) => 48 - i),
            right: Array.from({ length: 22 }, (_, i) => 22 - i),
            spacer: 2, spacerLabel: 'KỆ CHUI'
        };
    }
    return {
        type: 'split',
        left: Array.from({ length: 30 }, (_, i) => 48 - i),
        right: Array.from({ length: 18 }, (_, i) => 18 - i),
        spacer: 2, spacerLabel: 'KỆ CHUI'
    };
};

// --- 4. COMPONENT: RACK LEVEL ---
const RackLevel = ({ row, col, level, slotData, onClick }) => {
    const label = `${row}${level}${col}`;
    let currentPercent = 0;
    if (slotData && slotData.length > 0) {
        currentPercent = Math.max(...slotData.map(d => d.PhanTram || 0));
    }

    return (
        <Box
            onClick={() => onClick({ row, col, level, percent: currentPercent, label, data: slotData })}
            sx={{
                height: `${SLOT_HEIGHT}px`, width: '100%',
                bgcolor: getSlotColor(currentPercent),
                color: getTextColor(currentPercent),
                border: `1px solid ${THEME.rackBorder}`,
                borderRadius: '2px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.1s',
                '&:hover': {
                    transform: 'scale(1.2)', zIndex: 10,
                    boxShadow: 3, border: '2px solid #ff9800', fontWeight: 'bold'
                }
            }}
        >
            <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, fontWeight: '500' }}>
                {label}
            </Typography>
        </Box>
    );
};

// --- 5. COMPONENT: RACK COLUMN (ĐÃ SỬA: BỎ CAPTION SỐ CỘT) ---
const RackColumn = ({ row, col, onSlotClick, getSlotData }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: '0.5px' }}>
        <Box sx={{ width: `${SLOT_WIDTH}px`, display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[3, 2, 1].map((level) => (
                <RackLevel
                    key={`${row}${col}-${level}`}
                    row={row} col={col} level={level}
                    slotData={getSlotData(row, col, level)}
                    onClick={onSlotClick}
                />
            ))}
        </Box>
        {/* Đã xóa Typography hiển thị số cột ở đây */}
    </Box>
);

// --- 6. COMPONENT: SINGLE ROW (CẬP NHẬT: THÊM HEADER NỀN VÀNG) ---
const SingleRowRender = ({ rowLabel, handleSlotClick, getSlotData }) => {
    const config = getRowConfig(rowLabel);

    return (
        // Container bao quanh: Căn đáy (flex-end) để Nhãn dòng (A, B) khớp với Kệ
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', mb: 2 }}>

            {/* Cụm: Tiêu đề Nền + Các ô kệ */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>

                {/* HEADER MỚI: NỀN A, NỀN B... */}
                <Box sx={{
                    bgcolor: '#fff59d', // Màu vàng nền (giống ảnh image_a3aa07)
                    // border: '1px solid #000', borderBottom: 'none', // Viền
                    textAlign: 'center', fontWeight: 'bold', fontSize: '10px',
                    py: 0.5, width: '100%'
                }}>
                    Nền {rowLabel}
                </Box>

                {/* PHẦN KỆ CHÍNH (Giữ nguyên logic cũ) */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    {/* KHỐI TRÁI */}
                    <Box sx={{ display: 'flex' }}>
                        {config.left.map(col => (
                            <RackColumn key={col} row={rowLabel} col={col} onSlotClick={handleSlotClick} getSlotData={getSlotData} />
                        ))}
                    </Box>

                    {/* KỆ CHUI / LỐI ĐI */}
                    <Box sx={{
                        width: `${config.spacer * SLOT_WIDTH}px`,
                        height: `${SLOT_HEIGHT * 3}px`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderLeft: '1px dashed #bdbdbd',
                        borderRight: '1px dashed #bdbdbd',
                        mx: '2px', bgcolor: '#fafafa'
                    }}>
                        <Typography variant="caption" sx={{
                            color: '#9e9e9e', fontSize: '8px', fontWeight: 'bold',
                            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                            textTransform: 'uppercase', letterSpacing: 1
                        }}>
                            {config.spacerLabel}
                        </Typography>
                    </Box>

                    {/* KHỐI PHẢI */}
                    <Box sx={{ display: 'flex' }}>
                        {config.right.map(col => (
                            <RackColumn key={col} row={rowLabel} col={col} onSlotClick={handleSlotClick} getSlotData={getSlotData} />
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* NHÃN DÒNG (BÊN PHẢI) */}
            <Box sx={{
                ml: 2, width: '40px', height: `${SLOT_HEIGHT * 3 + 15}px`,
                bgcolor: THEME.zoneYellow, color: '#000', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 1, boxShadow: 1, flexShrink: 0, border: '1px solid #000'
            }}>
                <Typography variant="h6">{rowLabel}</Typography>
            </Box>
        </Box>
    );
};

// --- 7. HEADER & ZONES ---
const TopGateHeader = () => {
    const leftBlockCols = 30; // Căn theo dãy B-H
    const leftBlockWidth = leftBlockCols * COL_FULL_WIDTH;
    const gateWidth = (2 * SLOT_WIDTH) + 4;

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '50px', width: '100%' }}>
            <Box sx={{ width: `${leftBlockWidth}px`, borderBottom: '2px solid #000', flexShrink: 0 }} />
            <Box sx={{
                width: `${gateWidth}px`, height: '100%',
                borderLeft: '2px solid #000', borderRight: '2px solid #000',
                position: 'relative', display: 'flex', justifyContent: 'center', flexShrink: 0
            }}>
                <Box sx={{
                    position: 'absolute', top: 0,
                    bgcolor: THEME.zoneYellow, px: 1, py: 0.5, border: '1px solid #000',
                    fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', zIndex: 1
                }}>CỬA NHẬP HÀNG</Box>
            </Box>
            <Box sx={{ flexGrow: 1, borderBottom: '2px solid #000' }} />
        </Box>
    );
};

const RightZoneBox = ({ label, height = '100%', icon }) => (
    <Box sx={{
        height: height, width: '100%', bgcolor: THEME.zoneYellow, border: '1px solid #000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        p: 1, textAlign: 'center'
    }}>
        {icon && <Box sx={{ mb: 1, color: '#000' }}>{icon}</Box>}
        <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'uppercase', color: '#000', fontSize: '10px' }}>{label}</Typography>
    </Box>
);

const RightSideGate = ({ label }) => (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
        <Box sx={{ width: '40px', height: '100%', borderTop: '2px solid #000', borderBottom: '2px solid #000', position: 'absolute', right: 0, top: 0 }} />
        <Box sx={{ mr: 3, bgcolor: THEME.zoneYellow, px: 1, py: 0.5, border: '1px solid #000', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 1, boxShadow: 1, position: 'absolute', right: 0 }}>{label}</Box>
    </Box>
);

const WallSpacer = () => (<Box sx={{ flex: 1, borderRight: '2px solid #000' }} />);

// --- 8. MAIN DASHBOARD ---
const WarehouseDashboard = () => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [openModal, setOpenModal] = useState(false);

    // State cho Modal Tổng
    const [openTotalModal, setOpenTotalModal] = useState(false);

    const [warehouseData, setWarehouseData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('https://nodeapi.z76.vn/erp_plp/baocao/ton-layout-btp?TenNha=Kho%20TP&ID_Kho=5&MaVung=B');
                const json = await res.json();
                if (json.success) setWarehouseData(json.data);
            } catch (error) {
                console.error("API Error", error);
                setWarehouseData([
                    { "MaViTriKho": "A11", "MaTang": "1", "maday": "A", "ton": 100, "Ten_SanPham": "Hàng A11", "PhanTram": 20, "ItemCode": "SP01" },
                    { "MaViTriKho": "I231", "MaTang": "1", "maday": "I", "ton": 960, "Ten_SanPham": "Mép trái kệ I", "PhanTram": 100, "ItemCode": "SP03" },
                    { "MaViTriKho": "H191", "MaTang": "1", "maday": "H", "ton": 500, "Ten_SanPham": "Mép trái kệ H", "PhanTram": 50, "ItemCode": "SP04" },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const slotMap = useMemo(() => {
        const map = {};
        warehouseData.forEach(item => {
            if (item.MaViTriKho) {
                if (!map[item.MaViTriKho]) map[item.MaViTriKho] = [];
                map[item.MaViTriKho].push(item);
            }
        });
        return map;
    }, [warehouseData]);

    // --- TÍNH TỔNG TỒN KHO ---
    const totalInventoryStats = useMemo(() => {
        return warehouseData.reduce((acc, item) => {
            // Cộng tổng số lượng (ton)
            acc.totalTon += (item.ton || 0);
            // Đếm tổng số kiện/bản ghi
            acc.totalItems += 1;
            return acc;
        }, { totalTon: 0, totalItems: 0 });
    }, [warehouseData]);

    const getSlotData = (row, col, level) => {
        const key = `${row}${level}${col}`;
        return slotMap[key] || [];
    };

    const handleSlotClick = (slotInfo) => {
        setSelectedSlot(slotInfo);
        setOpenModal(true);
    };

    const handleClose = () => setOpenModal(false);

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /> Đang tải...</Box>;

    return (
        <Box sx={{
            p: 2, bgcolor: '#f0f2f5', minHeight: '100vh',
            overflowX: 'auto',
            display: 'flex', justifyContent: 'flex-start', flexDirection: 'column'
        }}>

            {/* --- NÚT TỔNG HỢP TỒN KHO --- */}
            <Box sx={{ position: 'sticky', left: 20, top: 0, zIndex: 100, mb: 1 }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Assessment />}
                    onClick={() => setOpenTotalModal(true)}
                    sx={{ boxShadow: 3, fontWeight: 'bold' }}
                >
                    Xem Tổng Tồn Kho
                </Button>
            </Box>

            <Box sx={{ pb: 4 }}>
                {/* HEADER */}
                <Box sx={{ display: 'flex', mb: 0 }}>
                    <Box sx={{ flexGrow: 1, pr: '2px' }}><TopGateHeader /></Box>
                    <Box sx={{ width: '250px', borderBottom: '2px solid #000' }} />
                </Box>

                {/* KHU VỰC KHO */}
                <Box sx={{ display: 'flex', border: THEME.wallBorder, borderTop: 'none', bgcolor: '#fff', position: 'relative' }}>
                    <Box sx={{ p: 3, flexGrow: 1, borderRight: '2px solid #000' }}>
                        {['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].map(row => (
                            <SingleRowRender key={row} rowLabel={row} handleSlotClick={handleSlotClick} getSlotData={getSlotData} />
                        ))}
                    </Box>
                    {/* SIDEBAR PHẢI */}
                    <Box sx={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ flex: 2, display: 'flex' }}>
                            <Box sx={{ flex: 1, p: 2, borderRight: '2px solid #000', display: 'flex', alignItems: 'center' }}>
                                <RightZoneBox label="KHU VỰC CHỜ NHẬP" icon={<Inventory />} height="100%" />
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex' }}><RightSideGate label="CỬA XUẤT CONT" /></Box>
                        <Box sx={{ flex: 2, display: 'flex' }}>
                            <Box sx={{ flex: 1, p: 2, borderRight: '2px solid #000', display: 'flex', alignItems: 'center' }}>
                                <RightZoneBox label="KHU VỰC CHỜ XUẤT" icon={<Logout />} />
                            </Box>
                        </Box>
                        <WallSpacer />
                        <Box sx={{ height: '50px', display: 'flex' }}><RightSideGate label="CỬA RA VÀO (CỬA ĐÓNG)" /></Box>
                        <Box sx={{ flex: 2, display: 'flex' }}>
                            <Box sx={{ flex: 1, p: 2, borderRight: '2px solid #000', display: 'flex', alignItems: 'center' }}>
                                <RightZoneBox label="KHU VỰC DÁN SHU / QUÉT RFID" icon={<QrCodeScanner />} />
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', borderTop: '2px solid #000' }}>
                            <Box sx={{ flex: 1, p: 2, borderRight: '2px solid #000', display: 'flex', alignItems: 'center' }}>
                                <RightZoneBox label="KV KIỂM CUỐI + VP KHO" icon={<FactCheck />} />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* NOTE */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, position: 'sticky', left: 0 }}>
                    {[{ label: 'Trống', color: '#fff', border: true }, { label: '1-25%', color: '#e3f2fd' }, { label: '26-50%', color: '#64b5f6' }, { label: '51-75%', color: '#66bb6a' }, { label: '76-99%', color: '#ffa726' }, { label: 'Full (100%)', color: '#d32f2f', text: '#fff' }].map((note, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 20, height: 20, bgcolor: note.color, border: note.border ? '1px solid #ccc' : 'none', color: note.text || '#000', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                            <Typography variant="caption">{note.label}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* --- DIALOG CHI TIẾT Ô KỆ --- */}
            <Dialog open={openModal} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6">Vị trí: <strong>{selectedSlot?.label}</strong></Typography>
                        {selectedSlot?.percent > 0 && <Chip label={`${selectedSlot.percent}%`} sx={{ bgcolor: getSlotColor(selectedSlot.percent), color: getTextColor(selectedSlot.percent), fontWeight: 'bold' }} />}
                    </Box>
                    <IconButton onClick={handleClose} size="small"><Close /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedSlot?.data && selectedSlot?.data.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small" stickyHeader>
                                <TableHead sx={{ bgcolor: '#eee' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Mã SP</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Tên Sản Phẩm</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Tồn</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="center">%</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Mã Đơn</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedSlot.data.map((item, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>{item.ItemCode}</TableCell>
                                            <TableCell>{item.Ten_SanPham}</TableCell>
                                            <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>{item.ton?.toLocaleString()}</TableCell>
                                            <TableCell align="center">{item.PhanTram}%</TableCell>
                                            <TableCell>{item.Ma_DonHang}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                            <Inventory sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
                            <Typography>Vị trí trống</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleClose} variant="contained">Đóng</Button></DialogActions>
            </Dialog>

            {/* --- DIALOG TỔNG TỒN KHO (MỚI THÊM) --- */}
            <Dialog open={openTotalModal} onClose={() => setOpenTotalModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#e3f2fd' }}>
                    <Assessment color="primary" />
                    <Typography variant="h6" fontWeight="bold">Tổng Hợp Tồn Kho</Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Card sx={{ bgcolor: '#f5f5f5', border: '1px solid #ddd' }}>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <LocalShipping sx={{ fontSize: 50, color: '#1976d2', mb: 1 }} />
                                    <Typography variant="h5" color="text.secondary" gutterBottom>
                                        TỔNG SỐ LƯỢNG (TON)
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" color="primary">
                                        {totalInventoryStats.totalTon.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        (Tổng hợp từ {totalInventoryStats.totalItems} bản ghi vị trí)
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTotalModal(false)} variant="outlined">Đóng</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default WarehouseDashboard;