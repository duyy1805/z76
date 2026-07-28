import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { attachAuthToken, setUnauthorizedHandler } from "../lib/api";
import { getTokenExpiration, isAccessTokenValid } from "../lib/authToken";

const LS_KEY = "z76_auth_sos";
const SS_KEY = "z76_auth_sos_ss";

function parseStoredAuth(storage, key) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const auth = JSON.parse(raw);
        if (isAccessTokenValid(auth?.token)) return auth;
        storage.removeItem(key);
    } catch {
        storage.removeItem(key);
    }
    return null;
}

function readAuth() {
    return parseStoredAuth(localStorage, LS_KEY) || parseStoredAuth(sessionStorage, SS_KEY);
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
    const [savedAuth] = useState(readAuth);
    const [token, setToken] = useState(savedAuth?.token || null);
    const [user, setUser] = useState(savedAuth?.user || null);
    const [role, setRole] = useState(savedAuth?.role || "NhanVien");
    const [permissions, setPermissions] = useState(savedAuth?.permissions || []);
    const [expenseReviewerCodes, setExpenseReviewerCodes] = useState(savedAuth?.expenseReviewerCodes || []);
    const [invoiceRole, setInvoiceRole] = useState(savedAuth?.invoiceRole || "NhanVien");
    const [invoicePermissions, setInvoicePermissions] = useState(savedAuth?.invoicePermissions || []);
    const [invoiceTypeCodes, setInvoiceTypeCodes] = useState(savedAuth?.invoiceTypeCodes || []);

    const logout = useCallback(() => {
        clearAuth();
        attachAuthToken(null);
        setToken(null);
        setUser(null);
        setRole("NhanVien");
        setPermissions([]);
        setExpenseReviewerCodes([]);
        setInvoiceRole("NhanVien");
        setInvoicePermissions([]);
        setInvoiceTypeCodes([]);
    }, []);

    useEffect(() => {
        attachAuthToken(token);
    }, [token]);

    useEffect(() => setUnauthorizedHandler(logout), [logout]);

    useEffect(() => {
        if (!token) return undefined;
        const expiration = getTokenExpiration(token);
        if (expiration === null || expiration <= Date.now()) {
            logout();
            return undefined;
        }
        const timeout = window.setTimeout(logout, Math.min(expiration - Date.now(), 2_147_483_647));
        return () => window.clearTimeout(timeout);
    }, [logout, token]);

    const login = useCallback(({
        token: nextToken,
        user: nextUser,
        role: nextRole,
        permissions: nextPermissions,
        expenseReviewerCodes: nextExpenseReviewerCodes,
        invoiceRole: nextInvoiceRole,
        invoicePermissions: nextInvoicePermissions,
        invoiceTypeCodes: nextInvoiceTypeCodes,
    }, remember) => {
        if (!isAccessTokenValid(nextToken)) {
            throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
        const payload = {
            token: nextToken,
            user: nextUser,
            role: nextRole || "NhanVien",
            permissions: nextPermissions || [],
            expenseReviewerCodes: nextExpenseReviewerCodes || [],
            invoiceRole: nextInvoiceRole || "NhanVien",
            invoicePermissions: nextInvoicePermissions || [],
            invoiceTypeCodes: nextInvoiceTypeCodes || [],
        };

        writeAuth(payload, remember);
        setToken(payload.token);
        setUser(payload.user);
        setRole(payload.role);
        setPermissions(payload.permissions);
        setExpenseReviewerCodes(payload.expenseReviewerCodes);
        setInvoiceRole(payload.invoiceRole);
        setInvoicePermissions(payload.invoicePermissions);
        setInvoiceTypeCodes(payload.invoiceTypeCodes);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                role,
                permissions,
                expenseReviewerCodes,
                invoiceRole,
                invoicePermissions,
                invoiceTypeCodes,
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
