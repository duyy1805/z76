// src/lib/api.js
import axios from "axios";


const BASE = import.meta.env.VITE_API_BASE || "https://nodeapi.z76.vn/sosec";
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "https://apipccc.z76.vn/auth/loginERP";
const API_KEY = import.meta.env.VITE_API_KEY;

const http = axios.create({
    baseURL: BASE,
    timeout: 10000,
});

// Tạo instance RIÊNG cho auth để tránh bị ảnh hưởng bởi interceptor/transform của http
const httpAuth = axios.create({
    baseURL: new URL(LOGIN_URL).origin,   // "https://apipccc.z76.vn"
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        "ApiKey": API_KEY,
    },
    // Ép serialize JSON đúng chuẩn, tránh bị cấu hình global nào đó đổi sang form
    transformRequest: [(data) => JSON.stringify(data)],
});

export async function loginERP({ username, password }) {
    const path = new URL(LOGIN_URL).pathname; // "/auth/loginERP"
    const res = await httpAuth.post(path, { username, password }); // body JSON chuẩn
    return res.data;
}

export async function getRoleByUserId(userId) {
    const { data } = await http.get(`/role/${userId}`);
    return data?.role || "NhanVien";
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
    async listDonVi() {
        const { data } = await http.get("/donvi");
        return data; // [{ id, name, stk, TonTai }]
    },
    async createDonVi({ name, stk }) {
        const { data } = await http.post("/donvi", { name, stk });
        return data;
    },
    async updateDonVi(id, { name, stk, maNganHang }) {
        const { data } = await http.put(`/donvi/${id}`, { name, stk, maNganHang });
        return data;
    },

    async deleteDonVi(id) {
        const { data } = await http.delete(`/donvi/${id}`);
        return data;
    },

    // Phiếu
    async listPhieu(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/phieu${q ? `?${q}` : ""}`);
        return data;
    },
    async createPhieu(payload) {
        const { data } = await http.post("/phieu", payload);
        return data; // {id}
    },
    // lib/api.js
    async approve(phieuId, role, agree, user) {
        const body = {
            nguoiDuyetId: user?.id,      // lấy từ thông tin auth
            tenNguoiDuyet: user?.username || role,
            chapThuan: !!agree,
            ghiChu: null,
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
};

// Nếu muốn tự động gắn token vào http:
export function attachAuthToken(token) {
    http.interceptors.request.use((config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
}
