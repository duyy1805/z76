import { useState } from "react";
import { api } from "../../lib/api";

export default function usePhieuSecWorkflow({
    user,
    role,
    activeTab,
    detail,
    setDetail,
    setOpenDetail,
    setRows,
    setPendingLenhChiRows,
    canApprove,
    canReject,
    canReturn,
    canSubmit,
    canDelete,
    load,
    loadPendingLenhChi,
    resetAttachments,
    setToast,
    log = () => {},
}) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnTarget, setReturnTarget] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnSubmitting, setReturnSubmitting] = useState(false);
    const [deletePhieuOpen, setDeletePhieuOpen] = useState(false);
    const [deletePhieuTarget, setDeletePhieuTarget] = useState(null);
    const [deletePhieuSubmitting, setDeletePhieuSubmitting] = useState(false);
    const [submitPhieuId, setSubmitPhieuId] = useState(null);

    const handleApprove = async (phieu, agree, event) => {
        event?.stopPropagation();
        if (!agree) {
            setRejectTarget(phieu);
            setRejectReason("");
            setRejectOpen(true);
            return;
        }

        try {
            log("approve:before", {
                phieuId: phieu?.id,
                phieuIdDonVi: phieu?.idDonVi,
                trangThai: phieu?.trangThai,
                agree,
                role,
                userId: user?.id,
                userIdDonVi: user?.idDonVi,
                canApprove: canApprove(phieu),
            });
            if (!canApprove(phieu)) throw new Error("Bạn không có quyền duyệt ở bước này");
            const updated = await api.approve(phieu.id, role, true, user);
            log("approve:after", updated);
            setRows((rows) => rows?.map((item) => item.id === updated.id ? updated : item));
            setDetail((current) => current?.id === updated.id ? updated : current);
            setToast({ open: true, msg: "Đã duyệt", type: "success" });
        } catch (error) {
            log("approve:error", error?.response?.data || error);
            setToast({ open: true, msg: error.message ?? "Lỗi duyệt phiếu", type: "error" });
        }
    };

    const handleSubmitPhieu = async (phieu, event) => {
        event?.stopPropagation();
        if (!canSubmit(phieu)) return;
        try {
            setSubmitPhieuId(phieu.id);
            const updated = await api.submitPhieu(phieu.id, { ...user, role });
            setRows((rows) => rows?.map((item) => item.id === updated.id ? updated : item));
            setDetail((current) => current?.id === updated.id ? updated : current);
            setToast({ open: true, msg: "Đã trình TBP", type: "success" });
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || error.message || "Lỗi trình phiếu",
                type: "error",
            });
        } finally {
            setSubmitPhieuId(null);
        }
    };

    const submitReject = async () => {
        const reason = rejectReason.trim();
        if (!reason) {
            setToast({ open: true, msg: "Nhập lý do từ chối", type: "warning" });
            return;
        }
        try {
            setRejectSubmitting(true);
            if (!canReject(rejectTarget)) throw new Error("Bạn không có quyền từ chối ở bước này");
            const updated = await api.approve(rejectTarget.id, role, false, user, reason);
            setRows((rows) => rows?.map((item) => item.id === updated.id ? updated : item));
            setDetail((current) => current?.id === updated.id ? updated : current);
            setRejectOpen(false);
            setRejectTarget(null);
            setRejectReason("");
            setToast({ open: true, msg: "Đã từ chối phiếu", type: "success" });
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || error.message || "Lỗi từ chối phiếu",
                type: "error",
            });
        } finally {
            setRejectSubmitting(false);
        }
    };

    const openReturnDialog = (phieu, event) => {
        event?.stopPropagation();
        if (!canReturn(phieu)) return;
        setReturnTarget(phieu);
        setReturnReason("");
        setReturnOpen(true);
    };

    const submitReturn = async () => {
        const reason = returnReason.trim();
        if (!reason) {
            setToast({ open: true, msg: "Nhập lý do trả lại", type: "warning" });
            return;
        }
        try {
            setReturnSubmitting(true);
            if (!canReturn(returnTarget)) throw new Error("Bạn không có quyền trả lại phiếu ở bước này");
            const updated = await api.returnPhieu(returnTarget.id, role, user, reason);
            setDetail((current) => current?.id === updated.id ? updated : current);
            setRows((rows) => rows?.map((item) => item.id === updated.id ? updated : item));
            setPendingLenhChiRows((rows) => rows?.filter((item) => item.id !== updated.id));
            if (activeTab === "pending") await loadPendingLenhChi();
            else await load();
            setReturnOpen(false);
            setReturnTarget(null);
            setReturnReason("");
            setToast({ open: true, msg: "Đã trả lại phiếu để chỉnh sửa", type: "success" });
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || error.message || "Lỗi trả lại phiếu",
                type: "error",
            });
        } finally {
            setReturnSubmitting(false);
        }
    };

    const openDeletePhieuDialog = (phieu, event) => {
        event?.stopPropagation();
        if (!canDelete(phieu)) return;
        setDeletePhieuTarget(phieu);
        setDeletePhieuOpen(true);
    };

    const submitDeletePhieu = async () => {
        if (!deletePhieuTarget) return;
        try {
            setDeletePhieuSubmitting(true);
            if (!canDelete(deletePhieuTarget)) throw new Error("Bạn không có quyền xoá phiếu này");
            await api.deletePhieu(deletePhieuTarget.id, user);
            setRows((rows) => rows?.filter((item) => item.id !== deletePhieuTarget.id));
            setPendingLenhChiRows((rows) => rows?.filter((item) => item.id !== deletePhieuTarget.id));
            if (detail?.id === deletePhieuTarget.id) {
                setOpenDetail(false);
                setDetail(null);
                resetAttachments();
            }
            setDeletePhieuOpen(false);
            setDeletePhieuTarget(null);
            setToast({ open: true, msg: "Đã xoá phiếu", type: "success" });
        } catch (error) {
            setToast({
                open: true,
                msg: error?.response?.data?.message || error.message || "Lỗi xoá phiếu",
                type: "error",
            });
        } finally {
            setDeletePhieuSubmitting(false);
        }
    };

    return {
        rejectOpen,
        setRejectOpen,
        rejectReason,
        setRejectReason,
        rejectSubmitting,
        returnOpen,
        setReturnOpen,
        returnReason,
        setReturnReason,
        returnSubmitting,
        deletePhieuOpen,
        setDeletePhieuOpen,
        deletePhieuTarget,
        deletePhieuSubmitting,
        submitPhieuId,
        handleApprove,
        handleSubmitPhieu,
        submitReject,
        openReturnDialog,
        submitReturn,
        openDeletePhieuDialog,
        submitDeletePhieu,
    };
}
