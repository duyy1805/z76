import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Avatar,
    Grid,
    Chip,
    IconButton,
    createTheme,
    ThemeProvider,
    CssBaseline,
    AppBar,
    Toolbar,
    Paper,
    Skeleton,
    Stack,
    Button,
    useMediaQuery,
    Tabs,
    Tab
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Business as BusinessIcon,
    Work as WorkIcon,
    Groups as GroupsIcon,
    ErrorOutline as ErrorIcon,
    Factory as FactoryIcon,
    AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import { motion as Motion, AnimatePresence } from 'framer-motion';

// --- THEME SETUP ---
const dashboardTheme = createTheme({
    palette: {
        primary: {
            main: '#0F62FE', // Blue IBM style
        },
        secondary: {
            main: '#393939',
        },
        background: {
            default: '#F2F4F8',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#161616',
            secondary: '#525252',
        }
    },
    shape: {
        borderRadius: 12,
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 700,
        }
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    minHeight: 64
                }
            }
        }
    }
});

// --- UTILS ---
const stringToColor = (string) => {
    if (!string) return '#ccc';
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const getInitials = (name) => {
    if (!name) return '??';
    const names = String(name).trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// --- DATA NORMALIZATION ---
const normalizeData = (apiData) => {
    if (!Array.isArray(apiData)) return [];

    return apiData.map(item => {
        if (!item) return { fullName: 'Dữ liệu lỗi', jobTitle: '', organization: '' };

        return {
            fullName: item.fullName || item.full_name || item.ho_ten || 'Khách mời',
            jobTitle: item.jobTitle || item.job_title || item.chuc_vu || '',
            organization: item.organization || item.don_vi || item.co_quan || ''
        };
    });
};

// --- COMPONENT CHÍNH ---
const ParticipantDashboard = () => {
    // --- STATE ---
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // State quản lý Event ID: 1 (Nhà máy), 2 (Tổng cục)
    const [eventId, setEventId] = useState(1);

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Gọi API với query param event_id
            const response = await fetch(`https://nodeapi.z76.vn/hoitruong/B5/participants?event_id=${eventId}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const result = await response.json();
            console.log("Raw API Data:", result);

            const rawData = Array.isArray(result) ? result : (result.data || []);
            const normalizedList = normalizeData(rawData);

            setParticipants(normalizedList);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Lỗi tải dữ liệu:", err);
            setError("Không thể kết nối đến máy chủ dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    // Reload khi eventId thay đổi hoặc auto refresh
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [eventId]);

    // --- HANDLERS ---
    const handleTabChange = (event, newValue) => {
        setEventId(newValue);
        setSearchTerm(''); // Reset tìm kiếm khi chuyển tab
    };

    // --- FILTER ---
    const filteredList = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return participants.filter(p =>
            (String(p.fullName || '').toLowerCase().includes(term)) ||
            (String(p.organization || '').toLowerCase().includes(term)) ||
            (String(p.jobTitle || '').toLowerCase().includes(term))
        );
    }, [participants, searchTerm]);

    // --- RENDER CARD ---
    const ParticipantCard = ({ data }) => (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                        sx={{
                            width: 50,
                            height: 50,
                            bgcolor: stringToColor(data.fullName || 'Guest'),
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            boxShadow: 1,
                            border: '2px solid white'
                        }}
                    >
                        {getInitials(data.fullName)}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap title={data.fullName} sx={{ lineHeight: 1.2, mb: 0.5 }}>
                            {data.fullName}
                        </Typography>

                        {data.jobTitle && (
                            <Stack direction="row" alignItems="center" spacing={0.5} mb={0.2}>
                                <WorkIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.8 }} />
                                <Typography variant="caption" color="primary.main" fontWeight="600" noWrap>
                                    {data.jobTitle}
                                </Typography>
                            </Stack>
                        )}

                        {data.organization && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.7 }} />
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {data.organization}
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <ThemeProvider theme={dashboardTheme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

                {/* --- APP BAR --- */}
                <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Toolbar sx={{ minHeight: { xs: 64, sm: 80 }, px: { xs: 1, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', py: { xs: 1, md: 0 } }}>

                        {/* LEFT: TITLE */}
                        <Box display="flex" alignItems="center" width={{ xs: '100%', md: 'auto' }} mb={{ xs: 1, md: 0 }}>
                            <GroupsIcon sx={{ color: 'primary.main', mr: 1.5, fontSize: 32 }} />
                            <Box>
                                <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1.1 }}>
                                    DANH SÁCH THAM DỰ
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Cập nhật: {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
                                </Typography>
                            </Box>
                        </Box>

                        {/* CENTER: EVENT TABS */}
                        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', width: { xs: '100%', md: 'auto' } }}>
                            <Tabs
                                value={eventId}
                                onChange={handleTabChange}
                                centered
                                indicatorColor="primary"
                                textColor="primary"
                                sx={{ minHeight: 48 }}
                            >
                                <Tab icon={<FactoryIcon fontSize="small" />} iconPosition="start" label="Nhà máy Z176" value={1} />
                                <Tab icon={<AccountBalanceIcon fontSize="small" />} iconPosition="start" label="Tổng cục CNQP" value={2} />
                            </Tabs>
                        </Box>

                        {/* RIGHT: ACTIONS */}
                        <Stack direction="row" spacing={1} alignItems="center" width={{ xs: '100%', md: 'auto' }} justifyContent={{ xs: 'space-between', md: 'flex-end' }} mt={{ xs: 1, md: 0 }}>
                            <Chip
                                label={loading ? "..." : `${participants.length} Khách`}
                                color="primary"
                                size="medium"
                                variant={loading ? "outlined" : "filled"}
                            />
                            <IconButton onClick={fetchData} disabled={loading} color="primary">
                                <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                            </IconButton>
                        </Stack>
                    </Toolbar>

                    {loading && <Box sx={{ height: 2, width: '100%', bgcolor: 'primary.light', position: 'absolute', bottom: 0 }}><Motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, repeat: Infinity }} style={{ height: '100%', background: '#0F62FE' }} /></Box>}
                </AppBar>

                {/* --- CONTENT AREA --- */}
                <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1, px: { xs: 2, sm: 3 } }}>

                    {/* SEARCH */}
                    <Box mb={3} display="flex" justifyContent="center">
                        <Paper
                            component="form"
                            elevation={0}
                            sx={{
                                p: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                maxWidth: 600,
                                border: '1px solid #e0e0e0',
                                borderRadius: 3,
                                transition: 'box-shadow 0.2s',
                                '&:focus-within': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderColor: 'primary.main' }
                            }}
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <IconButton sx={{ p: '10px' }} aria-label="search" disabled>
                                <SearchIcon color="action" />
                            </IconButton>
                            <TextField
                                sx={{ ml: 1, flex: 1 }}
                                variant="standard"
                                placeholder={`Tìm trong danh sách ${eventId === 1 ? 'Nhà máy' : 'Tổng cục'}...`}
                                InputProps={{ disableUnderline: true, style: { fontSize: '1rem' } }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <IconButton size="small" onClick={() => setSearchTerm('')}>
                                    <Box component="span" sx={{ fontSize: 20, color: 'text.secondary' }}>×</Box>
                                </IconButton>
                            )}
                        </Paper>
                    </Box>

                    {/* GRID LIST */}
                    {error ? (
                        <Box textAlign="center" py={8}>
                            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>Đã xảy ra lỗi</Typography>
                            <Typography color="text.secondary" mb={3}>{error}</Typography>
                            <Button variant="contained" onClick={fetchData} startIcon={<RefreshIcon />}>Thử lại</Button>
                        </Box>
                    ) : (
                        <Box>
                            {loading && participants.length === 0 ? (
                                <Grid container spacing={2}>
                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={n}>
                                            <Card sx={{ height: 100, p: 2, display: 'flex', alignItems: 'center' }}>
                                                <Skeleton variant="circular" width={50} height={50} sx={{ mr: 2 }} />
                                                <Box flex={1}>
                                                    <Skeleton width="80%" height={24} mb={0.5} />
                                                    <Skeleton width="50%" height={16} />
                                                </Box>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : filteredList.length === 0 ? (
                                <Box textAlign="center" py={8}>
                                    <Box component="img" src="https://cdn-icons-png.flaticon.com/512/7486/7486754.png" sx={{ width: 100, opacity: 0.3, mb: 2 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Không tìm thấy khách nào cho "{searchTerm}" tại {eventId === 1 ? 'Nhà máy' : 'Tổng cục'}
                                    </Typography>
                                </Box>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <Motion.div
                                        key={eventId} // Key quan trọng để trigger animation khi đổi tab
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Grid container spacing={2}>
                                            {filteredList.map((participant, index) => (
                                                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                                                    <ParticipantCard data={participant} />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Motion.div>
                                </AnimatePresence>
                            )}
                        </Box>
                    )}
                </Container>

                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </Box>
        </ThemeProvider>
    );
};

export default ParticipantDashboard;