import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { loginERP, attachAuthToken, getRoleByUserId } from "../lib/api";
import { useAuth } from "../store/useAuth";

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await loginERP({ username, password });
            const token = data?.accessToken;
            const user = data?.userInfo || { username };
            if (!token) throw new Error("Không nhận được accessToken từ hệ thống.");

            const userId = user?.id ?? user?.userId;
            if (!userId) console.warn("Không tìm thấy userId trong userInfo:", user);

            const access = userId
                ? await getRoleByUserId(userId)
                : { role: "NhanVien", permissions: [] };

            login({ token, user, role: access.role, permissions: access.permissions }, remember);
            attachAuthToken(token);
            window.location.replace("/dashboard");
        } catch (exception) {
            setError(
                exception?.response?.data?.message ||
                exception?.message ||
                "Đăng nhập thất bại"
            );
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = username.trim().length > 0 && password.length > 0;

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(420px, 0.9fr) minmax(560px, 1.1fr)" },
                bgcolor: "background.default",
            }}
        >
            <Box
                sx={{
                    display: { xs: "none", lg: "flex" },
                    position: "relative",
                    overflow: "hidden",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    p: 6,
                    color: "white",
                    background: "linear-gradient(145deg, #07132F 0%, #0B2458 55%, #155EEF 145%)",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        width: 440,
                        height: 440,
                        borderRadius: "50%",
                        right: -170,
                        top: -160,
                        border: "90px solid rgba(255,255,255,.04)",
                    },
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        width: 320,
                        height: 320,
                        borderRadius: "50%",
                        left: -170,
                        bottom: -150,
                        border: "70px solid rgba(21,94,239,.22)",
                    },
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
                    <Box
                        component="img"
                        src="/assets/image/logo.jpg"
                        alt="Logo Z76"
                        sx={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 2.5,
                            border: "1px solid rgba(255,255,255,.2)",
                            boxShadow: "0 8px 24px rgba(0,0,0,.25)",
                        }}
                    />
                    <Box>
                        <Typography sx={{ fontWeight: 850, fontSize: "1.15rem" }}>Z76 Finance</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,.62)", fontSize: "0.82rem" }}>
                            Hệ thống quản lý tài chính nội bộ
                        </Typography>
                    </Box>
                </Stack>

                <Box sx={{ position: "relative", zIndex: 1, maxWidth: 520 }}>
                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 850,
                            fontSize: "clamp(2.3rem, 4vw, 4rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.045em",
                        }}
                    >
                        Quản lý phiếu séc rõ ràng và hiệu quả.
                    </Typography>
                    <Typography sx={{ mt: 2.5, maxWidth: 440, color: "rgba(255,255,255,.68)", fontSize: "1rem", lineHeight: 1.7 }}>
                        Theo dõi toàn bộ quy trình từ lập phiếu, phê duyệt đến hoàn tất lệnh chi trong một hệ thống thống nhất.
                    </Typography>

                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 4, color: "rgba(255,255,255,.75)" }}>
                        <VerifiedUserOutlinedIcon />
                        <Typography variant="body2">Dữ liệu được bảo vệ theo quyền người dùng</Typography>
                    </Stack>
                </Box>

                <Typography variant="caption" sx={{ position: "relative", zIndex: 1, color: "rgba(255,255,255,.42)" }}>
                    © 2026 Z76 · Sổ séc điện tử
                </Typography>
            </Box>

            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: { xs: 2, sm: 4, lg: 6 },
                    position: "relative",
                }}
            >
                <Paper
                    component="form"
                    onSubmit={onSubmit}
                    elevation={0}
                    sx={{
                        width: 440,
                        maxWidth: "100%",
                        p: { xs: 2.5, sm: 4.5 },
                        borderRadius: 4,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        boxShadow: "0 20px 48px rgba(16,24,40,.09)",
                    }}
                >
                    <Stack spacing={2.25}>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ display: { xs: "flex", lg: "none" }, mb: 0.5 }}>
                            <Box
                                component="img"
                                src="/assets/image/logo.jpg"
                                alt="Logo Z76"
                                sx={{ width: 44, height: 44, objectFit: "cover", borderRadius: 2 }}
                            />
                            <Box>
                                <Typography sx={{ fontWeight: 850 }}>Z76 Finance</Typography>
                                <Typography variant="caption" color="text.secondary">Sổ séc điện tử</Typography>
                            </Box>
                        </Stack>

                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 850, fontSize: { xs: "1.5rem", sm: "1.75rem" } }}>
                                Chào mừng trở lại
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: "0.9rem" }}>
                                Đăng nhập bằng tài khoản ERP để tiếp tục.
                            </Typography>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            label="Tên đăng nhập"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoFocus
                            fullWidth
                            autoComplete="username"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            label="Mật khẩu"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            fullWidth
                            autoComplete="current-password"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <FormControlLabel
                            sx={{ alignSelf: "flex-start", mt: -0.5 }}
                            control={
                                <Checkbox
                                    checked={remember}
                                    onChange={(event) => setRemember(event.target.checked)}
                                />
                            }
                            label={<Typography variant="body2">Ghi nhớ đăng nhập</Typography>}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{ minHeight: 48, fontSize: "0.95rem" }}
                            disabled={loading || !canSubmit}
                            startIcon={loading ? <CircularProgress size={19} color="inherit" /> : null}
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </Button>

                        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ pt: 0.5 }}>
                            Chỉ sử dụng dành cho cán bộ, nhân viên được cấp quyền.
                        </Typography>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}
