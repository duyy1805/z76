import React, { useState } from 'react';
import {
    Box,
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
    InputAdornment,
    CircularProgress,
    alpha,
    Divider,
    Dialog,
    IconButton,
    createTheme,
    ThemeProvider,
    CssBaseline,
    Alert,
    Fade,
    Avatar,
    Chip,
    CardActionArea
} from '@mui/material';
import {
    PersonOutline as PersonIcon,
    WorkOutline as WorkIcon,
    Business as BusinessIcon,
    LocationOn as LocationIcon,
    Map as MapIcon,
    Send as SendIcon,
    Close as CloseIcon,
    Directions as DirectionsIcon,
    CheckCircle as CheckCircleIcon,
    AccountBalance as AccountBalanceIcon // Icon tòa nhà chính phủ/tổng cục
} from '@mui/icons-material';
import { motion as Motion } from 'framer-motion';

// --- THEME SETUP (HEADQUARTERS - RED/MILITARY STYLE) ---
const headquartersTheme = createTheme({
    palette: {
        primary: {
            main: '#D32F2F', // Màu đỏ cờ/quân đội
        },
        secondary: {
            main: '#FFC107', // Màu vàng bổ trợ
        },
        background: {
            default: '#F4F7FB',
        },
        text: {
            primary: '#161616',
            secondary: '#525252',
        }
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        '&:hover': { backgroundColor: '#fcfcfc' },
                        '&.Mui-focused': { backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(211, 47, 47, 0.15)' }
                    }
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    paddingTop: 12, paddingBottom: 12, fontSize: '1rem', boxShadow: 'none',
                    '&:hover': { boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)' }
                }
            }
        }
    }
});

// --- ANIMATION WRAPPER ---
const MotionWrapper = ({ children, delay = 0 }) => (
    <Motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: delay, type: "spring", stiffness: 100 }}
    >
        {children}
    </Motion.div>
);

const LandingRegisterHeadquarters = () => {
    // --- STATE ---
    const [formData, setFormData] = useState({
        fullName: '',
        jobTitle: '',
        organization: '',
    });

    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [openImageZoom, setOpenImageZoom] = useState(false);

    // --- CONSTANTS CHO TỔNG CỤC (EVENT ID = 2) ---
    const EVENT_ID = 2;
    const API_ENDPOINT = "https://nodeapi.z76.vn/hoitruong/B5/register";

    // Thông tin hiển thị riêng cho Tổng cục
    const LOCATION_NAME = "Tổng cục CNQP";
    const ADDRESS = "CT03, Đai Mỗ, Hà Nội";
    const MAP_URL = "https://maps.app.goo.gl/Ns37qkGdy17NYkju8";

    // Ảnh sơ đồ và Logo khác
    const DIAGRAM_IMAGE = "/assets/image/2.jpg";
    const LOGO_URL = "https://scontent.fhan9-1.fna.fbcdn.net/v/t39.30808-6/524645569_1380446854087980_8062810593220342677_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=f727a1&_nc_eui2=AeFm6ryek00QnGY9v7Nmnrti5GH1PGszugTkYfU8azO6BGB1qAGRGKwRrcMtGw85uw-WTcoJoLnwahDjmPcWDN9L&_nc_ohc=MAUQ4Cfow8IQ7kNvwGE8NZu&_nc_oc=AdkjWkIPmI0hwrqR2367CTDcIC0DxIRHK6u3u_JfPmY3-YHlJDx4mWrYPo4CgeDOGUw&_nc_zt=23&_nc_ht=scontent.fhan9-1.fna&_nc_gid=RF6U3t-YuXbcE3Xxmecv1A&oh=00_Afq_RsoljDMCYLlkVGupvC3vuufTDE77hin4SJI1FdpoTg&oe=6965010D";
    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
    };

    const handleSubmit = async () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = true;
        if (!formData.jobTitle.trim()) newErrors.jobTitle = true;
        if (!formData.organization.trim()) newErrors.organization = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            // Payload chuẩn DB: event_id = 2
            const payload = {
                event_id: EVENT_ID,        // 2
                full_name: formData.fullName,
                job_title: formData.jobTitle,
                organization: formData.organization
            };

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('API Error:', error);
            // SỬA LỖI TẠI ĐÂY: Không fake success nữa, báo lỗi thật
            setStatus('error');
            setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
        }
    };

    return (
        <ThemeProvider theme={headquartersTheme}>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                    background: `radial-gradient(circle at 10% 20%, ${alpha(headquartersTheme.palette.primary.main, 0.05)} 0%, transparent 40%),
                                #F4F7FB`,
                    pb: 8,
                    pt: { xs: 4, md: 6 },
                }}
            >
                <Container maxWidth="sm">
                    <Stack spacing={3}>

                        <MotionWrapper>
                            <Box
                                textAlign="center"
                                mb={2}
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                            >
                                {/* Logo */}
                                {/* Logo */}
                                <Box sx={{ position: 'relative', mb: 2 }}>
                                    <Avatar
                                        src={LOGO_URL}
                                        alt="Logo Z176"
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            backgroundColor: '#fff',
                                            borderRadius: '50%',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                            overflow: 'visible',          // 🔥 QUAN TRỌNG
                                            p: 1.2,                        // tạo viền trắng để không bị chạm mép
                                            '& img': {
                                                objectFit: 'contain',     // giữ trọn logo
                                                width: '90%',
                                                height: '90%',
                                            }
                                        }}
                                    />

                                </Box>

                                {/* LỄ KỶ NIỆM */}
                                <Typography
                                    sx={{
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        color: headquartersTheme.palette.primary.main,
                                        lineHeight: 1.1,
                                        mb: 0.5
                                    }}
                                >
                                    LỄ ĐÓN NHẬN
                                </Typography>

                                {/* 55 NĂM */}
                                <Typography
                                    sx={{
                                        fontSize: { xs: '2.3rem', sm: '2.8rem' },
                                        fontWeight: 900,
                                        lineHeight: 1.05,
                                        color: headquartersTheme.palette.primary.main,
                                        textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                        mb: 0.5
                                    }}
                                >
                                    {/* 55 NĂM */}
                                </Typography>

                                {/* NHÀ MÁY Z176 */}
                                <Typography
                                    sx={{
                                        fontSize: { xs: '1.15rem', sm: '1.3rem' },
                                        fontWeight: 800,
                                        textAlign: 'center',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: headquartersTheme.palette.primary.main,
                                    }}
                                >
                                    Huân chương bảo vệ tổ quốc hạng Nhất và kỷ niệm 55 năm ngày truyền thống <br /> Nhà máy Z176
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: { xs: '1rem', sm: '1.15rem' },
                                        fontWeight: 800,
                                        textAlign: 'center',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: headquartersTheme.palette.primary.main,
                                        mb: 1
                                    }}
                                >
                                    (09/3/1971 – 09/3/2026)
                                </Typography>
                                {/* Ngày tháng */}
                                <Typography
                                    sx={{
                                        fontSize: '0.95rem',
                                        color: 'text.secondary',
                                        mb: 0.5
                                    }}
                                >

                                    Tổ chức ngày <b>09/3/2026</b>
                                </Typography>

                                <Chip
                                    icon={<AccountBalanceIcon fontSize="small" />}
                                    label={LOCATION_NAME}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Box>
                        </MotionWrapper>


                        {/* --- FORM --- */}
                        <MotionWrapper delay={0.1}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', boxShadow: 2 }}>
                                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                                    {status === 'success' ? (
                                        <Box textAlign="center" py={4}>
                                            <Motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                                                <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                                            </Motion.div>
                                            <Typography variant="h5" fontWeight="bold" gutterBottom>Đăng ký thành công!</Typography>
                                            <Typography color="text.secondary">
                                                Cảm ơn <b>{formData.fullName}</b>.<br />Hẹn gặp lại quý khách tại {LOCATION_NAME}.
                                            </Typography>
                                            <Button variant="text" sx={{ mt: 3 }} onClick={() => { setStatus('idle'); setFormData({ fullName: '', jobTitle: '', organization: '' }); }}>
                                                Đăng ký người khác
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Stack spacing={2.5}>
                                            <TextField
                                                fullWidth label="Họ và tên" name="fullName"
                                                value={formData.fullName} onChange={handleChange}
                                                error={!!errors.fullName} helperText={errors.fullName && "Vui lòng nhập họ tên"}
                                                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }}
                                            />
                                            <TextField
                                                fullWidth label="Cấp bậc / Chức vụ" name="jobTitle"
                                                value={formData.jobTitle} onChange={handleChange}
                                                error={!!errors.jobTitle} helperText={errors.jobTitle && "Vui lòng nhập cấp bậc/chức vụ"}
                                                InputProps={{ startAdornment: <InputAdornment position="start"><WorkIcon color="action" /></InputAdornment> }}
                                            />
                                            <TextField
                                                fullWidth label="Đơn vị" name="organization"
                                                value={formData.organization} onChange={handleChange}
                                                error={!!errors.organization} helperText={errors.organization && "Vui lòng nhập đơn vị"}
                                                InputProps={{ startAdornment: <InputAdornment position="start"><BusinessIcon color="action" /></InputAdornment> }}
                                            />

                                            {status === 'error' && <Alert severity="error">{errorMessage}</Alert>}

                                            <Button
                                                fullWidth variant="contained" size="large"
                                                onClick={handleSubmit} disabled={status === 'loading'}
                                                startIcon={status === 'loading' ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                                sx={{ mt: 1 }}
                                            >
                                                {status === 'loading' ? "Đang gửi thông tin..." : "Xác nhận tham dự"}
                                            </Button>
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>
                        </MotionWrapper>

                        {/* --- MAP & DIAGRAM --- */}
                        <MotionWrapper delay={0.2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
                                <Card sx={{ flex: 1, borderRadius: 3, overflow: 'hidden', boxShadow: 2, minHeight: 200 }}>
                                    <CardActionArea
                                        onClick={() => window.open(MAP_URL, '_blank')}
                                        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}
                                    >
                                        <Box sx={{ position: 'relative', flexGrow: 1, minHeight: 200 }}>
                                            <Box component="img" src="https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 2 }}>
                                                <Typography variant="subtitle1" color="white" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                                                    <LocationIcon color="error" fontSize="small" /> {LOCATION_NAME}
                                                </Typography>
                                                <Typography variant="caption" color="rgba(255,255,255,0.8)">{ADDRESS}</Typography>
                                            </Box>
                                        </Box>
                                    </CardActionArea>
                                </Card>

                                <Card sx={{ width: { xs: '100%', sm: '140px' }, borderRadius: 3, border: '2px solid', borderColor: 'divider' }}>
                                    <CardActionArea onClick={() => setOpenImageZoom(true)} sx={{ height: '100%' }}>
                                        <Box sx={{ position: 'relative', height: '100%', minHeight: { xs: 100, sm: 'auto' } }}>
                                            <Box component="img" src={DIAGRAM_IMAGE} sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, position: 'absolute', inset: 0 }} />
                                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.1)' }}>
                                                <Stack alignItems="center">
                                                    <MapIcon sx={{ color: 'primary.main', fontSize: 30, bgcolor: 'white', p: 0.5, borderRadius: 1 }} />
                                                    <Typography variant="caption" fontWeight="bold" sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.9)', px: 1, borderRadius: 1 }}>Sơ đồ</Typography>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    </CardActionArea>
                                </Card>
                            </Stack>
                        </MotionWrapper>

                        {/* --- FOOTER --- */}
                        <Box textAlign="center" pt={2}>
                            <Divider sx={{ mb: 2, width: '40%', mx: 'auto', opacity: 0.5 }} />
                            <Typography variant="caption" color="text.disabled">
                                © 2026 Z176. Phát triển bởi Diễm Linh Cơ.
                            </Typography>
                        </Box>

                    </Stack>
                </Container>

                {/* --- FULLSCREEN IMAGE DIALOG --- */}
                <Dialog
                    fullScreen
                    open={openImageZoom}
                    onClose={() => setOpenImageZoom(false)}
                    TransitionComponent={Fade}
                    sx={{ '& .MuiDialog-paper': { bgcolor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(5px)' } }}
                >
                    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconButton
                            onClick={() => setOpenImageZoom(false)}
                            sx={{ position: 'absolute', top: 20, right: 20, color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <Box
                            component="img"
                            src={DIAGRAM_IMAGE}
                            sx={{ maxWidth: '100%', maxHeight: '100%', p: 2, objectFit: 'contain' }}
                            onClick={() => setOpenImageZoom(false)}
                        />
                        <Box sx={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center' }}>
                            <Typography color="white" variant="body2" sx={{ opacity: 0.7 }}>Chạm vào ảnh để đóng</Typography>
                        </Box>
                    </Box>
                </Dialog>

            </Box>
        </ThemeProvider>
    );
};

export default LandingRegisterHeadquarters;