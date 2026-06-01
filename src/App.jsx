import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Shell from "./components/Layout/Shell";

import Dashboard from "./pages/Dashboard";
import PhieuSec from "./pages/PhieuSec";
import Checkbooks from "./pages/Checkbooks";
import AdminSuppliers from "./pages/AdminSuppliers";

import HoaDon from "./pages/invoice/HoaDon";

import Login from "./pages/Login";

import WarehouseLayout from "./components/PLP/WarehouseMap";
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

      {/* =========== HỆ SỔ SÉC (layout Shell) =========== */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/phieu" element={<PhieuSec />} />
        <Route path="/admin" element={<AdminSuppliers />} />
        <Route path="/invoice" element={<HoaDon />} />
      </Route>

      {/* BẢN ĐỒ KHO HÀNG */}
      <Route path="/warehouse-map" element={<WarehouseLayout />} />
      {/* ROUTE MẶC ĐỊNH */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
