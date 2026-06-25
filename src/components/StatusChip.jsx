import { Chip } from "@mui/material";

const STATUS_MAP = {
    KhoiTao: { label: "Nháp", color: "#475467", background: "#F2F4F7" },
    ChoDuyet_TBP: { label: "Chờ TBP", color: "#B54708", background: "#FFF4E5" },
    ChoDuyet_ThuKyKTT: { label: "Chờ người phụ trách", color: "#027A48", background: "#ECFDF3" },
    ChoDuyet_KTT: { label: "Chờ KTT", color: "#175CD3", background: "#EFF4FF" },
    ChoDuyet_GD: { label: "Chờ GĐ", color: "#6941C6", background: "#F4F3FF" },
    HoanThanh: { label: "Hoàn thành", color: "#087443", background: "#ECFDF3" },
    HoanThanh_ChuaCoLenhChi: { label: "Chờ lệnh chi", color: "#B54708", background: "#FFF4E5" },
    HoanThanh_DaCoLenhChi: { label: "Đã có lệnh chi", color: "#087443", background: "#ECFDF3" },
    TuChoi: { label: "Từ chối", color: "#B42318", background: "#FEF3F2" },
};

export default function StatusChip({ status }) {
    const item = STATUS_MAP[status] || {
        label: status,
        color: "#475467",
        background: "#F2F4F7",
    };

    return (
        <Chip
            size="small"
            label={item.label}
            sx={{
                height: 26,
                borderRadius: 1.5,
                bgcolor: item.background,
                color: item.color,
                border: `1px solid ${item.color}18`,
                fontWeight: 750,
                fontSize: "0.75rem",
                "& .MuiChip-label": { px: 1.1 },
            }}
        />
    );
}
