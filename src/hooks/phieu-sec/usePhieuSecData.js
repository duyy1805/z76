import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function usePhieuSecData({
    mode,
    user,
    role,
    activeTab,
    canManageLenhChi,
    setForm,
    log = () => {},
}) {
    const [rows, setRows] = useState(null);
    const [pendingLenhChiRows, setPendingLenhChiRows] = useState(null);
    const [donvis, setDonvis] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [banks, setBanks] = useState([]);

    const load = async () => {
        const params = {
            userId: user?.id,
            roleCode: role,
            idDonVi: user?.idDonVi,
            loaiSec: mode,
        };

        log("load:listPhieu params", params, {
            user,
            localStorageAuth: localStorage.getItem("z76_auth_sos"),
            sessionStorageAuth: sessionStorage.getItem("z76_auth_sos_ss"),
        });

        const phieuRows = await api.listPhieu(params);
        log("load:listPhieu result", {
            count: phieuRows?.length ?? 0,
            ids: (phieuRows || []).map((item) => item.id),
            idDonVis: [...new Set((phieuRows || []).map((item) => item.idDonVi).filter(Boolean))],
            statusCounts: (phieuRows || []).reduce((acc, item) => {
                acc[item.trangThai || "unknown"] = (acc[item.trangThai || "unknown"] || 0) + 1;
                return acc;
            }, {}),
            sample: (phieuRows || []).slice(0, 5),
        });

        const [donViRows, currencyRows, bankRows] = await Promise.all([
            api.listDonVi(),
            api.listLoaiTien({ tontai: 1 }),
            api.listNganHang({ tontai: 1 }),
        ]);

        log("load:listDonVi result", { count: donViRows?.length ?? 0 });
        setRows(phieuRows);
        setDonvis(donViRows);
        setCurrencies(currencyRows || []);
        setBanks(bankRows || []);
        setForm((current) => ({
            ...current,
            donViId: current.donViId || donViRows?.[0]?.id || 1,
        }));
    };

    const loadPendingLenhChi = async () => {
        if (!canManageLenhChi || !user?.id) return;
        const pending = await api.listPendingLenhChi(user.id, { loaiSec: mode });
        log("load:pendingLenhChi result", {
            count: pending?.length ?? 0,
            ids: (pending || []).map((item) => item.id),
        });
        setPendingLenhChiRows(pending);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    useEffect(() => {
        if (activeTab === "pending") loadPendingLenhChi();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    return {
        rows,
        setRows,
        pendingLenhChiRows,
        setPendingLenhChiRows,
        donvis,
        setDonvis,
        currencies,
        banks,
        load,
        loadPendingLenhChi,
    };
}
