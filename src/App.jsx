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

import WarehouseLayout from "./components/PLP/WarehouseMap";
import { useAuth } from "./store/useAuth";

// B5
import ParticipantDashboard from "./components/B5/ParticipantDashboard";
import LandingRegister from "./components/B5/LandingRegister";
import LandingRegisterHeadquarters from "./components/B5/LandingRegisterHeadquarters";
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
      {/* BẢN ĐỒ KHO HÀNG */}
      <Route path="/warehouse-map" element={<WarehouseLayout />} />
      {/* B5: LANDING PAGE ĐĂNG KÝ THAM GIA SỰ KIỆN */}
      <Route path="/landing-register" element={<LandingRegister />} />
      <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
      <Route path="/landing-register-headquarters" element={<LandingRegisterHeadquarters />} />
      {/* ROUTE MẶC ĐỊNH */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
