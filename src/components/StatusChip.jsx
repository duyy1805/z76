import { Chip } from "@mui/material";

export default function StatusChip({ status }) {
    const map = {
        KhoiTao: { label: "Khởi tạo", color: "default" },
        ChoDuyet_TBP: { label: "Chờ TBP", color: "warning" },
        ChoDuyet_KTT: { label: "Chờ KTT", color: "info" },
        ChoDuyet_GD: { label: "Chờ GĐ", color: "info" },
        HoanThanh: { label: "Hoàn thành", color: "success" },
        HoanThanh_ChuaCoLenhChi: { label: "Chờ lệnh chi", color: "warning" },
        HoanThanh_DaCoLenhChi: { label: "Đã có lệnh chi", color: "success" },
        TuChoi: { label: "Từ chối", color: "error" },
    };
    const it = map[status] || { label: status, color: "default" };
    return <Chip size="small" color={it.color} label={it.label} />;
}
