// src/lib/api.js
import axios from "axios";


const BASE = import.meta.env.VITE_API_BASE || "https://nodeapi.z76.vn/sosec";
const HD_BASE = import.meta.env.VITE_HD_API_BASE || BASE.replace(/\/sosec\/?$/, "/hoadondientu");
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || BASE.replace(/\/sosec\/?$/, "/auth");
console.log("API_BASE:", BASE);
console.log("HD_API_BASE:", HD_BASE);
const http = axios.create({
    baseURL: BASE,
    timeout: 30000,
});
const httpHd = axios.create({
    baseURL: HD_BASE,
    timeout: 30000,
});

// Tạo instance RIÊNG cho auth để tránh bị ảnh hưởng bởi interceptor/transform của http
const httpAuth = axios.create({
    baseURL: AUTH_BASE,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
    // Ép serialize JSON đúng chuẩn, tránh bị cấu hình global nào đó đổi sang form
    withCredentials: true,
});

let unauthorizedHandler = null;
let unauthorizedNotified = false;

function handleUnauthorized(error) {
    if (error?.response?.status === 401 && !unauthorizedNotified && unauthorizedHandler) {
        unauthorizedNotified = true;
        unauthorizedHandler();
    }
    return Promise.reject(error);
}

http.interceptors.response.use((response) => response, handleUnauthorized);
httpHd.interceptors.response.use((response) => response, handleUnauthorized);

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = typeof handler === "function" ? handler : null;
    return () => {
        if (unauthorizedHandler === handler) unauthorizedHandler = null;
    };
}

export async function loginERP({ username, password }) {
    const path = "/login";
    const res = await httpAuth.post(path, { username, password, authFlow: "erp-otp" });
    return res.data;
}

export async function verifyLoginOtp({ challengeId, otp, trustDevice }) {
    const { data } = await httpAuth.post("/otp/verify", { challengeId, otp, trustDevice });
    return data;
}

export async function resendLoginOtp(challengeId) {
    const { data } = await httpAuth.post("/otp/resend", { challengeId });
    return data;
}

export async function logoutTrustedDevice() {
    const { data } = await httpAuth.post("/otp/logout");
    return data;
}

export async function getRoleByUserId(userId) {
    const { data } = await http.get(`/role/${userId}`);
    return {
        role: data?.role || "NhanVien",
        permissions: Array.isArray(data?.permissions) ? data.permissions : [],
        expenseReviewerCodes: Array.isArray(data?.expenseReviewerCodes) ? data.expenseReviewerCodes : [],
    };
}

export async function getHoaDonRoleByUserId(userId) {
    const { data } = await httpHd.get(`/role/${userId}`);
    return {
        role: data?.role || "NhanVien",
        permissions: Array.isArray(data?.permissions) ? data.permissions : [],
        invoiceTypeCodes: Array.isArray(data?.invoiceTypeCodes) ? data.invoiceTypeCodes : [],
    };
}

async function createLenhChi(phieuId, payload) {
    const { data } = await http.post(`/phieu/${phieuId}/lenhchi`, payload);
    return data;
}

// (tuỳ chọn) lấy chi tiết 1 phiếu (nên trả cả maLenhChi,...)
async function getPhieuById(id, params = {}) {
    const q = new URLSearchParams(params).toString();
    const { data } = await http.get(`/phieu/${id}${q ? `?${q}` : ""}`);
    return data;
}

export const api = {
    async listDonVi(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/donvi${q ? `?${q}` : ""}`);
        return data; // [{ id, name, stk, TonTai }]
    },
    async createDonVi({ name, stk, maNganHang, chiNhanhNganHang, tenChuyenKhoan }) {
        const { data } = await http.post("/donvi", { name, stk, maNganHang, chiNhanhNganHang, tenChuyenKhoan });
        return data;
    },
    async updateDonVi(id, payload) {
        const { data } = await http.put(`/donvi/${id}`, payload);
        return data;
    },

    async deleteDonVi(id) {
        const { data } = await http.delete(`/donvi/${id}`);
        return data;
    },
    async listNganHang(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/nganhang${q ? `?${q}` : ""}`);
        return data;
    },
    async createNganHang({ maNganHang, tenNganHang }) {
        const { data } = await http.post("/nganhang", { maNganHang, tenNganHang });
        return data;
    },
    async updateNganHang(maNganHang, { tenNganHang, tonTai }) {
        const { data } = await http.put(`/nganhang/${maNganHang}`, { tenNganHang, tonTai });
        return data;
    },
    async deleteNganHang(maNganHang) {
        const { data } = await http.delete(`/nganhang/${maNganHang}`);
        return data;
    },

    // Phiếu
    async listPhieu(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/phieu${q ? `?${q}` : ""}`);
        return data;
    },
    async listLoaiTien(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/loaitien${q ? `?${q}` : ""}`);
        return data;
    },
    async createLoaiTien({ maLoaiTien, tenLoaiTien }) {
        const { data } = await http.post("/loaitien", { maLoaiTien, tenLoaiTien });
        return data;
    },
    async updateLoaiTien(maLoaiTien, { tenLoaiTien, tonTai }) {
        const { data } = await http.put(`/loaitien/${maLoaiTien}`, { tenLoaiTien, tonTai });
        return data;
    },
    async deleteLoaiTien(maLoaiTien) {
        const { data } = await http.delete(`/loaitien/${maLoaiTien}`);
        return data;
    },
    async listExpenseReviewers(requesterUserId) {
        const { data } = await http.get("/expense-reviewers", { params: { requesterUserId } });
        return data;
    },
    async listAssignableUsers(requesterUserId) {
        const { data } = await http.get("/expense-reviewers/users", { params: { requesterUserId } });
        return data;
    },
    async replaceExpenseReviewers(maLoaiChiPhi, userIds, requesterUserId) {
        const { data } = await http.put(`/expense-reviewers/${maLoaiChiPhi}`, {
            userIds,
            requesterUserId,
        });
        return data;
    },
    async listPendingLenhChi(userId, params = {}) {
        const q = new URLSearchParams({ userId, ...params }).toString();
        const { data } = await http.get(`/lenhchi/pending?${q}`);
        return data;
    },
    async createPhieu(payload) {
        const { data } = await http.post("/phieu", payload);
        return data; // {id}
    },
    async updatePhieu(phieuId, payload) {
        const { data } = await http.put(`/phieu/${phieuId}`, payload);
        return data;
    },
    async submitPhieu(phieuId, user) {
        const { data } = await http.post(`/phieu/${phieuId}/submit`, {
            requesterUserId: user?.id,
            requesterRoleCode: user?.role,
            requesterIdDonVi: user?.idDonVi,
        });
        return data;
    },
    async deletePhieu(phieuId, user) {
        const { data } = await http.delete(`/phieu/${phieuId}`, {
            data: { requesterUserId: user?.id },
        });
        return data;
    },
    // lib/api.js
    async approve(phieuId, role, agree, user, ghiChu = null) {
        const body = {
            nguoiDuyetId: user?.id,      // lấy từ thông tin auth
            tenNguoiDuyet: user?.username || role,
            chapThuan: !!agree,
            ghiChu,
            requesterUserId: user?.id,
            requesterRoleCode: role,
            requesterIdDonVi: user?.idDonVi,
        };
        const { data } = await http.post(`/phieu/${phieuId}/approve`, body);
        return data;
    },
    async returnPhieu(phieuId, role, user, ghiChu) {
        const body = {
            nguoiDuyetId: user?.id,
            tenNguoiDuyet: user?.username || role,
            chapThuan: false,
            traLai: true,
            ghiChu,
            requesterUserId: user?.id,
            requesterRoleCode: role,
            requesterIdDonVi: user?.idDonVi,
        };
        const { data } = await http.post(`/phieu/${phieuId}/approve`, body);
        return data;
    },
    createLenhChi,
    getPhieuById,

    async getDashboard(params = {}) {
        const q = new URLSearchParams(
            Object.entries(params).reduce((acc, [k, v]) => {
                if (v !== undefined && v !== null && v !== "") acc[k] = v;
                return acc;
            }, {})
        ).toString();
        const { data } = await http.get(`/dashboard${q ? `?${q}` : ""}`);
        return data;
    },
    async getDashboardSummary(params = {}) {
        const q = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
        ).toString();
        const { data } = await http.get(`/dashboard/summary${q ? `?${q}` : ""}`);
        return data;
    },
    async getDashboardGrouped(params = {}) {
        const q = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
        ).toString();
        const { data } = await http.get(`/dashboard/grouped${q ? `?${q}` : ""}`);
        return data;
    },
    // ====== TÀI LIỆU PHIẾU SÉC ======

    // Lấy danh sách tài liệu của 1 phiếu
    async listTaiLieuPhieuSec(phieuSecId) {
        const { data } = await http.get(`/phieu/${phieuSecId}/tailieu`);
        return data;
        // [{ taiLieuId, fileName, nguoiTao, ngayTao, ... }] tuỳ backend trả
    },

    // Upload 1 hoặc nhiều file cho 1 phiếu
    async uploadTaiLieuPhieuSec(phieuSecId, formData) {
        const { data } = await http.post(
            `/phieu/${phieuSecId}/tailieu`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
    },

    getTaiLieuPhieuSecUrl(taiLieuId) {
        return `${http.defaults.baseURL}/phieu/tailieu/${taiLieuId}`;
    },

    async deleteTaiLieuPhieuSec(taiLieuId) {
        const { data } = await http.delete(`/phieu/tailieu/${taiLieuId}`);
        return data;
    },
};

function cleanParams(params = {}) {
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

export const hoaDonApi = {
    async lookupBusinessTaxCode(taxCode) {
        const { data } = await httpHd.get(`/tra-cuu-mst/${encodeURIComponent(taxCode)}`);
        return data;
    },
    async lookup() {
        const { data } = await httpHd.get("/lookup");
        return data;
    },
    async listHoaDon(params = {}) {
        const q = new URLSearchParams(cleanParams(params)).toString();
        const { data } = await httpHd.get(`/hoa-don${q ? `?${q}` : ""}`);
        return data;
    },
    async getHoaDon(id, params = {}) {
        const q = new URLSearchParams(cleanParams(params)).toString();
        const { data } = await httpHd.get(`/hoa-don/${id}${q ? `?${q}` : ""}`);
        return data;
    },
    async createHoaDon(payload) {
        const { data } = await httpHd.post("/hoa-don", payload);
        return data;
    },
    async updateHoaDon(id, payload) {
        const { data } = await httpHd.put(`/hoa-don/${id}`, payload);
        return data;
    },
    async deleteHoaDon(id, user) {
        const { data } = await httpHd.delete(`/hoa-don/${id}`, {
            data: { requesterUserId: user?.id },
        });
        return data;
    },
    async submitHoaDon(id, user) {
        const { data } = await httpHd.post(`/hoa-don/${id}/submit`, {
            requesterUserId: user?.id,
            requesterIdDonVi: user?.idDonVi,
        });
        return data;
    },
    async approveHoaDon(id, { hanhDong = "Duyet", user, ghiChu = null, tenNguoiThucHien = null }) {
        const { data } = await httpHd.post(`/hoa-don/${id}/approve`, {
            hanhDong,
            requesterUserId: user?.id,
            requesterIdDonVi: user?.idDonVi,
            tenNguoiThucHien: tenNguoiThucHien || user?.fullName || user?.name || user?.username,
            ghiChu,
        });
        return data;
    },
    async confirmHoaDonExported(id, payload, user) {
        const { data } = await httpHd.post(`/hoa-don/${id}/xac-nhan-da-xuat`, {
            ...payload,
            requesterUserId: user?.id,
            requesterIdDonVi: user?.idDonVi,
        });
        return data;
    },
    async updateThongTinXuatHoaDon(id, payload) {
        const { data } = await httpHd.put(`/hoa-don/${id}/thong-tin-xuat`, payload);
        return data;
    },
    async uploadTaiLieuHoaDon(id, files, user) {
        const formData = new FormData();
        Array.from(files || []).forEach((file) => formData.append("files", file));
        formData.append("requesterUserId", user?.id || "");
        formData.append("requesterIdDonVi", user?.idDonVi || "");
        const { data } = await httpHd.post(`/hoa-don/${id}/tai-lieu`, formData);
        return data;
    },
    getTaiLieuHoaDonUrl(taiLieuId, user) {
        const q = new URLSearchParams(cleanParams({ userId: user?.id, idDonVi: user?.idDonVi })).toString();
        return `${httpHd.defaults.baseURL}/hoa-don/tai-lieu/${taiLieuId}${q ? `?${q}` : ""}`;
    },
    async deleteTaiLieuHoaDon(taiLieuId, user) {
        const { data } = await httpHd.delete(`/hoa-don/tai-lieu/${taiLieuId}`, {
            data: {
                requesterUserId: user?.id,
                requesterIdDonVi: user?.idDonVi,
            },
        });
        return data;
    },
    async listNguoiMua(params = {}) {
        const q = new URLSearchParams(cleanParams(params)).toString();
        const { data } = await httpHd.get(`/nguoi-mua${q ? `?${q}` : ""}`);
        return data;
    },
    async getNguoiMua(id) {
        const { data } = await httpHd.get(`/nguoi-mua/${id}`);
        return data;
    },
    async createNguoiMua(payload) {
        const { data } = await httpHd.post("/nguoi-mua", payload);
        return data;
    },
    async updateNguoiMua(id, payload) {
        const { data } = await httpHd.put(`/nguoi-mua/${id}`, payload);
        return data;
    },
    async createNguoiMuaDiaChi(nguoiMuaId, payload) {
        const { data } = await httpHd.post(`/nguoi-mua/${nguoiMuaId}/dia-chi`, payload);
        return data;
    },
    async createNguoiMuaLienHe(nguoiMuaId, payload) {
        const { data } = await httpHd.post(`/nguoi-mua/${nguoiMuaId}/lien-he`, payload);
        return data;
    },
    async createNguoiMuaNganHang(nguoiMuaId, payload) {
        const { data } = await httpHd.post(`/nguoi-mua/${nguoiMuaId}/ngan-hang`, payload);
        return data;
    },
    async createDotXuatFile(payload) {
        const { data } = await httpHd.post("/dot-xuat-file", payload);
        return data;
    },
    getDotXuatFileExcelUrl(dotXuatFileId, user) {
        const q = new URLSearchParams(cleanParams({ userId: user?.id, idDonVi: user?.idDonVi })).toString();
        return `${httpHd.defaults.baseURL}/dot-xuat-file/${dotXuatFileId}/export.xlsx${q ? `?${q}` : ""}`;
    },
    async previewNhomImport(file, user) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("requesterUserId", user?.id || "");
        formData.append("requesterIdDonVi", user?.idDonVi || "");
        const { data } = await httpHd.post("/nhom-import/preview", formData);
        return data;
    },
    async createNhomImport(file, user, ghiChu = "") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("requesterUserId", user?.id || "");
        formData.append("requesterIdDonVi", user?.idDonVi || "");
        if (ghiChu) formData.append("ghiChu", ghiChu);
        const { data } = await httpHd.post("/nhom-import", formData);
        return data;
    },
    async listNhomImport(user) {
        const q = new URLSearchParams(cleanParams({ userId: user?.id, idDonVi: user?.idDonVi })).toString();
        const { data } = await httpHd.get(`/nhom-import?${q}`);
        return data;
    },
    async getNhomImport(id, user) {
        const q = new URLSearchParams(cleanParams({ userId: user?.id, idDonVi: user?.idDonVi })).toString();
        const { data } = await httpHd.get(`/nhom-import/${id}?${q}`);
        return data;
    },
    getNhomImportFileUrl(id, user) {
        const q = new URLSearchParams(cleanParams({ userId: user?.id, idDonVi: user?.idDonVi })).toString();
        return `${httpHd.defaults.baseURL}/nhom-import/${id}/file?${q}`;
    },
    async submitNhomImport(id, user) {
        const { data } = await httpHd.post(`/nhom-import/${id}/submit`, {
            requesterUserId: user?.id,
            requesterIdDonVi: user?.idDonVi,
        });
        return data;
    },
    async approveNhomImport(id, user) {
        const { data } = await httpHd.post(`/nhom-import/${id}/approve`, {
            requesterUserId: user?.id,
            requesterIdDonVi: user?.idDonVi,
            tenNguoiThucHien: user?.fullName || user?.name || user?.username,
        });
        return data;
    },
};

// Nếu muốn tự động gắn token vào http:
export function attachAuthToken(token) {
    for (const client of [http, httpHd]) {
        if (token) {
            client.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
            delete client.defaults.headers.common.Authorization;
        }
    }
    if (token) unauthorizedNotified = false;
}
