import { createContext, useContext, useEffect, useState } from "react";
import { attachAuthToken } from "../lib/api";

const LS_KEY = "z76_auth_sos";
const SS_KEY = "z76_auth_sos_ss";

function readAuth() {
    try {
        const remembered = localStorage.getItem(LS_KEY);
        const session = sessionStorage.getItem(SS_KEY);
        return remembered ? JSON.parse(remembered) : session ? JSON.parse(session) : null;
    } catch {
        return null;
    }
}

function writeAuth(data, remember) {
    if (remember) {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        sessionStorage.removeItem(SS_KEY);
        return;
    }

    sessionStorage.setItem(SS_KEY, JSON.stringify(data));
    localStorage.removeItem(LS_KEY);
}

function clearAuth() {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const savedAuth = readAuth();
    const [token, setToken] = useState(savedAuth?.token || null);
    const [user, setUser] = useState(savedAuth?.user || null);
    const [role, setRole] = useState(savedAuth?.role || "NhanVien");
    const [permissions, setPermissions] = useState(savedAuth?.permissions || []);
    const [expenseReviewerCodes, setExpenseReviewerCodes] = useState(savedAuth?.expenseReviewerCodes || []);

    useEffect(() => {
        if (token) attachAuthToken(token);
    }, [token]);

    const login = ({
        token: nextToken,
        user: nextUser,
        role: nextRole,
        permissions: nextPermissions,
        expenseReviewerCodes: nextExpenseReviewerCodes,
    }, remember) => {
        const payload = {
            token: nextToken,
            user: nextUser,
            role: nextRole || "NhanVien",
            permissions: nextPermissions || [],
            expenseReviewerCodes: nextExpenseReviewerCodes || [],
        };

        writeAuth(payload, remember);
        setToken(payload.token);
        setUser(payload.user);
        setRole(payload.role);
        setPermissions(payload.permissions);
        setExpenseReviewerCodes(payload.expenseReviewerCodes);
    };

    const logout = () => {
        clearAuth();
        setToken(null);
        setUser(null);
        setRole("NhanVien");
        setPermissions([]);
        setExpenseReviewerCodes([]);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                role,
                permissions,
                expenseReviewerCodes,
                login,
                logout,
                setRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
