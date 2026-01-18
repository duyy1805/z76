// src/lib/api_invoice.js
import axios from "axios";

// const BASE = import.meta.env.VITE_API_INVOICE_BASE || "https://nodeapi.z76.vn/invoice";
const BASE = "http://localhost:5000/invoice/invoice";

const http = axios.create({
    baseURL: BASE,
    timeout: 10000,
});

export const apiInvoice = {
    listHoaDon(params = {}) {
        const q = new URLSearchParams(params).toString();
        return http.get(q ? `?${q}` : "").then(r => r.data);
    },

    createHoaDon(payload) {
        return http.post("/", payload).then(r => r.data);
    },

    saveHoaDon(id) {
        return http.post(`/${id}/save`).then(r => r.data);
    },

    approveHoaDon(id, body) {
        return http.post(`/${id}/approve`, body).then(r => r.data);
    },

    getChiTiet(id) {
        return http.get(`/${id}/items`).then(r => r.data);
    },

    addChiTiet(id, payload) {
        return http.post(`/${id}/items`, payload).then(r => r.data);
    },

    updateChiTiet(itemId, payload) {
        return http.put(`/items/${itemId}`, payload).then(r => r.data);
    },

    deleteChiTiet(itemId) {
        return http.delete(`/items/${itemId}`).then(r => r.data);
    }
};

export function attachInvoiceAuthToken(token) {
    http.interceptors.request.use(cfg => {
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
        return cfg;
    });
}
