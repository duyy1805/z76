import { useState } from "react";
import {
    Box, Paper, TextField, Button, Typography, Stack, Checkbox, FormControlLabel,
    IconButton, InputAdornment, Alert, CircularProgress
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { loginERP, attachAuthToken, getRoleByUserId } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // Map chuẩn theo API thật: { message, accessToken, userInfo: {...} }
    const mapLoginResponse = (data) => {
        const token = data?.accessToken;
        const user = data?.userInfo || { username };
        return { token, user };
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const data = await loginERP({ username, password });
            const { token, user } = mapLoginResponse(data);
            if (!token) throw new Error("Không nhận được accessToken từ hệ thống.");

            // Lấy userId thật từ userInfo (tuỳ backend có thể là 'id' hoặc 'userId')
            const userId = user?.id ?? user?.userId;
            // Fallback nếu không có:
            if (!userId) console.warn("⚠️ Không tìm thấy userId trong userInfo:", user);

            // Gọi API nội bộ lấy role từ SS_fn_UserRoleCode
            const role = userId ? await getRoleByUserId(userId) : "NhanVien";

            // Lưu phiên + gắn token cho axios nội bộ
            login({ token, user, role }, remember);
            attachAuthToken(token);

            navigate("/dashboard");
        } catch (ex) {
            const msg = ex?.response?.data?.message || ex?.message || "Đăng nhập thất bại";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = username.trim().length > 0 && password.length > 0;

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
                p: 2,
            }}
        >
            <Paper
                elevation={3}
                sx={{ p: 4, width: 400, maxWidth: "90vw" }}
                component="form"
                onSubmit={onSubmit}
            >
                <Stack spacing={2}>
                    <Typography variant="h5" fontWeight={700} textAlign="center">
                        Đăng nhập Z76
                    </Typography>

                    {err && <Alert severity="error">{err}</Alert>}

                    <TextField
                        label="Tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                        fullWidth
                        autoComplete="username"
                    />

                    <TextField
                        label="Mật khẩu"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        autoComplete="current-password"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton edge="end" onClick={() => setShowPwd((v) => !v)}>
                                        {showPwd ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                        }
                        label="Ghi nhớ đăng nhập"
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || !canSubmit}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>

                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        Sổ séc điện tử · Z76
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
