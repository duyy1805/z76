import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Shell from "./components/Layout/Shell";
import Shell_TGSX from "./components/Layout/Shell_TGSX";

import Dashboard from "./pages/Dashboard";
import PhieuSec from "./pages/PhieuSec";
import Checkbooks from "./pages/Checkbooks";
import AdminSuppliers from "./pages/AdminSuppliers";

import DinhMucPage from "./pages/TGSX/DinhMucPage";
import ThoiGianSXPage from "./pages/TGSX/ThoiGianSXPage";

import Login from "./pages/Login";
import LoginTGSX from "./pages/TGSX/LoginTGSX";

import { useAuth } from "./store/useAuth";

// ============ AUTH CHO SỔ SÉC =============
function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Shell><Outlet /></Shell>;
}

// ============ AUTH CHO TÍNH THỜI GIAN SX =============
function RequireAuth_TGSX() {
  const { token_tgsx } = useAuth();
  const location = useLocation();

  if (!token_tgsx)
    return <Navigate to="/tgsx/login" state={{ from: location }} replace />;

  return <Shell_TGSX><Outlet /></Shell_TGSX>;
}

export default function App() {
  return (
    <Routes>
      {/* LOGIN CHO MỖI HỆ */}
      <Route path="/login" element={<Login />} />
      <Route path="/tgsx/login" element={<LoginTGSX />} />

      {/* =========== HỆ SỔ SÉC (layout Shell) =========== */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/phieu" element={<PhieuSec />} />
        <Route path="/sos" element={<Checkbooks />} />
        <Route path="/admin" element={<AdminSuppliers />} />
      </Route>

      {/* =========== HỆ TÍNH THỜI GIAN SX (layout Shell_TGSX) =========== */}
      <Route element={<RequireAuth_TGSX />}>
        <Route path="/tgsx/dinhmuc" element={<DinhMucPage />} />
        <Route path="/tgsx/thoigian" element={<ThoiGianSXPage />} />
      </Route>

      {/* ROUTE MẶC ĐỊNH */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
