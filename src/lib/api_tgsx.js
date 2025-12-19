// src/lib/api_tgsx.js
import axios from "axios";

/* =====================================================
   BASE CONFIG
===================================================== */
// const BASE = import.meta.env.VITE_API_BASE || "https://nodeapi.z76.vn/sosec";
const BASE = "http://localhost:5000/erp";

/*
  TẤT CẢ API TGSX ĐI QUA PREFIX /tgsx
  → khi gọi KHÔNG ĐƯỢC lặp lại /tgsx nữa
*/
const http = axios.create({
    baseURL: BASE + "/tgsx",
    timeout: 10000,
});

/* =====================================================
        API TGSX
===================================================== */
export const apiTGSX = {
    /* ----------------------------------------
        0) PREVIEW EXCEL (KHÔNG GHI DB)
        POST /erp/tgsx/import-excel/preview
    ----------------------------------------- */
    async previewExcel(file) {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await http.post(
            "/import-excel/preview",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
    },

    /* ----------------------------------------
        1) IMPORT EXCEL (GHI DB)
        POST /erp/tgsx/import-excel
    ----------------------------------------- */
    async importExcel(file) {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await http.post(
            "/import-excel",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
    },

    /* ----------------------------------------
        2) DANH SÁCH SẢN PHẨM
        GET /erp/tgsx/sanpham
    ----------------------------------------- */
    async listSanPham() {
        const { data } = await http.get("/sanpham");
        return data;
    },

    /* ----------------------------------------
        3) CHI TIẾT SẢN PHẨM
        GET /erp/tgsx/sanpham/:id
    ----------------------------------------- */
    async getSanPhamDetail(id) {
        const { data } = await http.get(`/sanpham/${id}`);
        return data;
    },

    /* ----------------------------------------
        4) EXPORT EXCEL
        GET /erp/tgsx/sanpham/:id/export
        (return file → dùng window.open)
    ----------------------------------------- */
    async exportExcel(id) {
        const res = await http.get(`/sanpham/${id}/export`, {
            responseType: "blob", // QUAN TRỌNG
        });

        return res;
    },

    /* ----------------------------------------
        5) CẬP NHẬT TRẠNG THÁI (1 / 0)
        PUT /erp/tgsx/sanpham/status/:id
    ----------------------------------------- */
    async updateTrangThai(id, trangThai) {
        const { data } = await http.put(`/sanpham/status/${id}`, {
            trangThai: Number(trangThai), // 1 hoặc 0
        });
        return data;
    },

    /* ----------------------------------------
    6) BẢNG THỜI GIAN SẢN XUẤT THEO HIỆU SUẤT
    GET /erp/tgsx/table-data
----------------------------------------- */
    async getTableData(params = {}) {
        const q = new URLSearchParams(params).toString();
        const { data } = await http.get(`/table-data${q ? `?${q}` : ""}`);
        return data; // { success, total, data }
    },

    /* ===== OPTIONAL CRUD ===== */
    async createSanPham(payload) {
        const { data } = await http.post(`/sanpham`, payload);
        return data;
    },

    async updateSanPham(id, payload) {
        const { data } = await http.put(`/sanpham/${id}`, payload);
        return data;
    },

    async deleteSanPham(id) {
        const { data } = await http.delete(`/sanpham/${id}`);
        return data;
    },
};

/* =====================================================
    GẮN TOKEN (GIỐNG api.js)
===================================================== */
export function attachTGSXAuthToken(token) {
    http.interceptors.request.use((config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
}
