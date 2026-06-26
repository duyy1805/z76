import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Shell from "./components/Layout/Shell";

import Dashboard from "./pages/Dashboard";
import PhieuSec from "./pages/PhieuSec";
import AdminSuppliers from "./pages/AdminSuppliers";
import HoaDonListPage from "./pages/HoaDonListPage";
import HoaDonFormPage from "./pages/HoaDonFormPage";
import HoaDonDetailPage from "./pages/HoaDonDetailPage";

import Login from "./pages/Login";

import { useAuth } from "./store/useAuth";


// ============ AUTH CHO SỔ SÉC =============
function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Shell><Outlet /></Shell>;
}


export default function App() {
  return (
    <Routes>
      {/* LOGIN CHO MỖI HỆ */}
      <Route path="/login" element={<Login />} />

      {/* =========== HỆ SỔ SÉC (layout Shell) =========== */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-vnd" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard-ngoai-te" element={<Navigate to="/dashboard?loaiSec=NgoaiTe" replace />} />
        <Route path="/phieu-vnd" element={<PhieuSec mode="VND" />} />
        <Route path="/phieu-ngoai-te" element={<PhieuSec mode="NgoaiTe" />} />
        <Route path="/hoa-don-dien-tu" element={<HoaDonListPage />} />
        <Route path="/hoa-don-dien-tu/new" element={<HoaDonFormPage />} />
        <Route path="/hoa-don-dien-tu/:id" element={<HoaDonDetailPage />} />
        <Route path="/hoa-don-dien-tu/:id/edit" element={<HoaDonFormPage />} />
        <Route path="/admin" element={<AdminSuppliers />} />
      </Route>

      {/* BẢN ĐỒ KHO HÀNG */}
      {/* ROUTE MẶC ĐỊNH */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
