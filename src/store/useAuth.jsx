import { createContext, useContext, useEffect, useState } from "react";
import { attachAuthToken } from "../lib/api";

const LS_KEY = "z76_auth";     // nhớ đăng nhập
const SS_KEY = "z76_auth_ss";  // phiên tạm

function readAuth() {
    try {
        const rawLS = localStorage.getItem(LS_KEY);
        const rawSS = sessionStorage.getItem(SS_KEY);
        return rawLS ? JSON.parse(rawLS) : rawSS ? JSON.parse(rawSS) : null;
    } catch {
        return null;
    }
}
function writeAuth(data, remember) {
    if (remember) {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        sessionStorage.removeItem(SS_KEY);
    } else {
        sessionStorage.setItem(SS_KEY, JSON.stringify(data));
        localStorage.removeItem(LS_KEY);
    }
}
function clearAuth() {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
}

/* ======================= Context ======================= */
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Rehydrate từ storage
    const saved = readAuth();
    const [token, setToken] = useState(saved?.token || null);
    const [user, setUser] = useState(saved?.user || null);
    const [role, setRole] = useState(saved?.role || "NhanVien");

    // Gắn token cho axios khi khởi động / khi token đổi
    useEffect(() => {
        if (token) attachAuthToken(token);
    }, [token]);

    const login = ({ token, user, role }, remember) => {
        const payload = { token, user, role: role || "NhanVien" };
        writeAuth(payload, remember);   // lưu cả bộ
        setToken(payload.token);
        setUser(payload.user);
        setRole(payload.role);
    };

    const logout = () => {
        clearAuth();
        setToken(null);
        setUser(null);
        setRole("NhanVien");
    };

    return (
        <AuthContext.Provider value={{ token, user, role, setRole, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
