import { createContext, useContext, useEffect, useState } from "react";
import { attachAuthToken } from "../lib/api";

/* =======================================================
    STORAGE KEYS — TÁCH RIÊNG CHO HAI HỆ THỐNG
======================================================= */
const LS_KEY_SOS = "z76_auth_sos";     // Remember login for Sổ Séc
const SS_KEY_SOS = "z76_auth_sos_ss";  // Session login

const LS_KEY_TGSX = "z76_auth_tgsx";     // Remember login for TGSX
const SS_KEY_TGSX = "z76_auth_tgsx_ss";  // Session login


/* =======================================================
    HÀM ĐỘC LẬP CHO 2 HỆ THỐNG
======================================================= */
function readAuth(lsKey, ssKey) {
    try {
        const rawLS = localStorage.getItem(lsKey);
        const rawSS = sessionStorage.getItem(ssKey);
        return rawLS ? JSON.parse(rawLS) : rawSS ? JSON.parse(rawSS) : null;
    } catch {
        return null;
    }
}

function writeAuth(lsKey, ssKey, data, remember) {
    if (remember) {
        localStorage.setItem(lsKey, JSON.stringify(data));
        sessionStorage.removeItem(ssKey);
    } else {
        sessionStorage.setItem(ssKey, JSON.stringify(data));
        localStorage.removeItem(lsKey);
    }
}

function clearAuth(lsKey, ssKey) {
    localStorage.removeItem(lsKey);
    sessionStorage.removeItem(ssKey);
}


/* =======================================================
                  CONTEXT CHÍNH
======================================================= */
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    /* -------------------------------------------------------
        1) STATE CHO HỆ SỔ SÉC (mặc định)
    -------------------------------------------------------- */
    const savedSOS = readAuth(LS_KEY_SOS, SS_KEY_SOS);

    const [token, setToken] = useState(savedSOS?.token || null);
    const [user, setUser] = useState(savedSOS?.user || null);
    const [role, setRole] = useState(savedSOS?.role || "NhanVien");
    const [permissions, setPermissions] = useState(savedSOS?.permissions || []);

    /* -------------------------------------------------------
        2) STATE CHO HỆ TGSX
    -------------------------------------------------------- */
    const savedTGSX = readAuth(LS_KEY_TGSX, SS_KEY_TGSX);

    const [token_tgsx, setTokenTGSX] = useState(savedTGSX?.token_tgsx || null);
    const [user_tgsx, setUserTGSX] = useState(savedTGSX?.user_tgsx || null);
    const [role_tgsx, setRoleTGSX] = useState(savedTGSX?.role_tgsx || "NhanVien");


    /* -------------------------------------------------------
        Auto attach token cho axios (ưu tiên token TGSX nếu dùng)
    -------------------------------------------------------- */
    useEffect(() => {
        if (token) attachAuthToken(token);
    }, [token]);

    useEffect(() => {
        if (token_tgsx) attachAuthToken(token_tgsx);
    }, [token_tgsx]);


    /* -------------------------------------------------------
        LOGIN – LOGOUT CHO HỆ SỔ SÉC
    -------------------------------------------------------- */
    const login = ({ token, user, role, permissions }, remember) => {
        const payload = { token, user, role: role || "NhanVien", permissions: permissions || [] };
        writeAuth(LS_KEY_SOS, SS_KEY_SOS, payload, remember);

        setToken(payload.token);
        setUser(payload.user);
        setRole(payload.role);
        setPermissions(payload.permissions);
    };

    const logout = () => {
        clearAuth(LS_KEY_SOS, SS_KEY_SOS);
        setToken(null);
        setUser(null);
        setRole("NhanVien");
        setPermissions([]);
    };


    /* -------------------------------------------------------
        LOGIN – LOGOUT CHO HỆ TGSX
    -------------------------------------------------------- */
    const loginTGSX = ({ token_tgsx, user_tgsx, role_tgsx }, remember) => {
        const payload = { token_tgsx, user_tgsx, role_tgsx: role_tgsx || "NhanVien" };
        writeAuth(LS_KEY_TGSX, SS_KEY_TGSX, payload, remember);

        setTokenTGSX(payload.token_tgsx);
        setUserTGSX(payload.user_tgsx);
        setRoleTGSX(payload.role_tgsx);
    };

    const logoutTGSX = () => {
        clearAuth(LS_KEY_TGSX, SS_KEY_TGSX);
        setTokenTGSX(null);
        setUserTGSX(null);
        setRoleTGSX("NhanVien");
    };


    return (
        <AuthContext.Provider
            value={{
                /* SỔ SÉC */
                token,
                user,
                role,
                permissions,
                login,
                logout,
                setRole,

                /* TGSX */
                token_tgsx,
                user_tgsx,
                role_tgsx,
                loginTGSX,
                logoutTGSX,
                setRoleTGSX,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
