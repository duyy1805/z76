import { useEffect, useState } from "react";
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
import {
    loginERP,
    verifyLoginOtp,
    resendLoginOtp,
    attachAuthToken,
    getRoleByUserId,
    getHoaDonRoleByUserId,
} from "../lib/api";
import { useAuth } from "../store/useAuth";

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otpChallenge, setOtpChallenge] = useState(null);
    const [otp, setOtp] = useState("");
    const [trustDevice, setTrustDevice] = useState(true);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!otpChallenge) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [otpChallenge]);

    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await loginERP({ username, password });
            if (data?.status === "otp_required") {
                const resendAfter = Number(data.resendAfter || 60);
                setOtpChallenge({
                    ...data,
                    resendAt: Date.now() + resendAfter * 1000,
                    expiresAt: Date.now() + Number(data.expiresIn || 300) * 1000,
                });
                setOtp("");
                setNow(Date.now());
                return;
            }
            const token = data?.accessToken;
            const user = data?.userInfo || { username };
            if (!token) throw new Error("Không nhận được accessToken từ hệ thống.");

            const userId = user?.id ?? user?.userId;
            if (!userId) console.warn("Không tìm thấy userId trong userInfo:", user);

            const [access, invoiceAccess] = userId
                ? await Promise.all([
                    getRoleByUserId(userId),
                    getHoaDonRoleByUserId(userId).catch((error) => {
                        console.warn("KhÃ´ng láº¥y Ä‘Æ°á»£c quyá»n hÃ³a Ä‘Æ¡n:", error);
                        return { role: "NhanVien", permissions: [], invoiceTypeCodes: [] };
                    }),
                ])
                : [
                    { role: "NhanVien", permissions: [], expenseReviewerCodes: [] },
                    { role: "NhanVien", permissions: [], invoiceTypeCodes: [] },
                ];

            login({
                token,
                user,
                role: access.role,
                permissions: access.permissions,
                expenseReviewerCodes: access.expenseReviewerCodes,
                invoiceRole: invoiceAccess.role,
                invoicePermissions: invoiceAccess.permissions,
                invoiceTypeCodes: invoiceAccess.invoiceTypeCodes,
            }, remember);
            attachAuthToken(token);
        } catch (exception) {
            const requestId = exception?.response?.data?.requestId || exception?.response?.headers?.["x-auth-request-id"];
            const message = exception?.response?.data?.message || exception?.message || "Đăng nhập thất bại";
            console.error("[AUTH] login_failed", {
                requestId,
                status: exception?.response?.status,
                message,
            });
            setError(requestId ? `${message} (Mã tra cứu: ${requestId})` : message);
        } finally {
            setLoading(false);
        }
    };

    const onOtpSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await verifyLoginOtp({
                challengeId: otpChallenge.challengeId,
                otp,
                trustDevice,
            });
            const token = data?.accessToken;
            const user = data?.userInfo || { username };
            if (!token) throw new Error("Không nhận được accessToken từ hệ thống.");

            const userId = user?.id ?? user?.userId;
            const [access, invoiceAccess] = userId
                ? await Promise.all([
                    getRoleByUserId(userId),
                    getHoaDonRoleByUserId(userId).catch(() => ({ role: "NhanVien", permissions: [], invoiceTypeCodes: [] })),
                ])
                : [
                    { role: "NhanVien", permissions: [], expenseReviewerCodes: [] },
                    { role: "NhanVien", permissions: [], invoiceTypeCodes: [] },
                ];

            login({
                token,
                user,
                role: access.role,
                permissions: access.permissions,
                expenseReviewerCodes: access.expenseReviewerCodes,
                invoiceRole: invoiceAccess.role,
                invoicePermissions: invoiceAccess.permissions,
                invoiceTypeCodes: invoiceAccess.invoiceTypeCodes,
            }, remember);
            attachAuthToken(token);
        } catch (exception) {
            setError(exception?.response?.data?.message || exception?.message || "Mã OTP không hợp lệ");
        } finally {
            setLoading(false);
        }
    };

    const onResendOtp = async () => {
        setError("");
        setLoading(true);
        try {
            const data = await resendLoginOtp(otpChallenge.challengeId);
            const resendAfter = Number(data.resendAfter || 60);
            setOtpChallenge((current) => ({
                ...current,
                ...data,
                resendAt: Date.now() + resendAfter * 1000,
                expiresAt: Date.now() + Number(data.expiresIn || 300) * 1000,
            }));
            setOtp("");
            setNow(Date.now());
        } catch (exception) {
            setError(exception?.response?.data?.message || "Chưa thể gửi lại mã OTP");
        } finally {
            setLoading(false);
        }
    };

    const resetOtp = () => {
        setOtpChallenge(null);
        setOtp("");
        setPassword("");
        setError("");
    };

    const canSubmit = username.trim().length > 0 && password.length > 0;
    const resendSeconds = otpChallenge ? Math.max(0, Math.ceil((otpChallenge.resendAt - now) / 1000)) : 0;
    const expiresSeconds = otpChallenge ? Math.max(0, Math.ceil((otpChallenge.expiresAt - now) / 1000)) : 0;

    return (
        <Box
            sx={{
                minHeight: "100dvh",
                minWidth: 0,
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
                    minHeight: "100dvh",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: { xs: 1.5, sm: 4, lg: 6 },
                    position: "relative",
                }}
            >
                <Paper
                    component="form"
                    onSubmit={otpChallenge ? onOtpSubmit : onSubmit}
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
                                {otpChallenge ? "Xác minh đăng nhập" : "Chào mừng trở lại"}
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: "0.9rem" }}>
                                {otpChallenge
                                    ? `Mã OTP đã được gửi tới ${otpChallenge.maskedEmail}.`
                                    : "Đăng nhập bằng tài khoản ERP để tiếp tục."}
                            </Typography>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {!otpChallenge && <TextField
                            label="Tên đăng nhập"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            fullWidth
                            autoComplete="username"
                            inputProps={{ style: { fontSize: 16 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />}

                        {!otpChallenge && <TextField
                            label="Mật khẩu"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            fullWidth
                            autoComplete="current-password"
                            inputProps={{ style: { fontSize: 16 } }}
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
                        />}

                        {!otpChallenge && <FormControlLabel
                            sx={{ alignSelf: "flex-start", mt: -0.5 }}
                            control={
                                <Checkbox
                                    checked={remember}
                                    onChange={(event) => setRemember(event.target.checked)}
                                />
                            }
                            label={<Typography variant="body2">Ghi nhớ đăng nhập</Typography>}
                        />}

                        {otpChallenge && (
                            <>
                                <TextField
                                    label="Mã OTP"
                                    value={otp}
                                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                    fullWidth
                                    autoFocus
                                    autoComplete="one-time-code"
                                    inputProps={{ inputMode: "numeric", maxLength: 6, style: { fontSize: 22, letterSpacing: 8, textAlign: "center" } }}
                                />
                                <Typography variant="caption" color={expiresSeconds > 0 ? "text.secondary" : "error"} textAlign="center">
                                    {expiresSeconds > 0
                                        ? `Mã hết hạn sau ${Math.floor(expiresSeconds / 60)}:${String(expiresSeconds % 60).padStart(2, "0")}`
                                        : "Mã OTP đã hết hạn. Hãy gửi lại mã mới."}
                                </Typography>
                                <FormControlLabel
                                    sx={{ alignSelf: "flex-start", mt: -0.5 }}
                                    control={
                                        <Checkbox
                                            checked={trustDevice}
                                            onChange={(event) => setTrustDevice(event.target.checked)}
                                        />
                                    }
                                    label={<Typography variant="body2">Tin cậy thiết bị này trong 7 ngày</Typography>}
                                />
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Button type="button" variant="text" onClick={resetOtp} disabled={loading}>
                                        Quay lại
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="text"
                                        onClick={onResendOtp}
                                        disabled={loading || resendSeconds > 0}
                                    >
                                        {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : "Gửi lại mã"}
                                    </Button>
                                </Stack>
                            </>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{ minHeight: 48, fontSize: "0.95rem" }}
                            disabled={loading || (otpChallenge ? otp.length !== 6 || expiresSeconds === 0 : !canSubmit)}
                            startIcon={loading ? <CircularProgress size={19} color="inherit" /> : null}
                        >
                            {loading
                                ? (otpChallenge ? "Đang xác minh..." : "Đang đăng nhập...")
                                : (otpChallenge ? "Xác minh OTP" : "Đăng nhập")}
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
