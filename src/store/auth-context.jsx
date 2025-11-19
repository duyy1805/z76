import { createContext, useState } from "react";
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export default function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("NhanVien");

    const login = ({ token, user, role }, remember) => {
        setToken(token); setUser(user); setRole(role);
        if (remember) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
    };
    const logout = () => {
        setToken(null); setUser(null); setRole("NhanVien");
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ token, user, role, setRole, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
