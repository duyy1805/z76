import { useState } from "react";
import { api } from "../../lib/api";

export default function usePhieuSecAttachments({ detail, user, canDelete, setToast }) {
    const [attachList, setAttachList] = useState([]);
    const [attachLoading, setAttachLoading] = useState(false);
    const [attachUploading, setAttachUploading] = useState(false);
    const [attachFiles, setAttachFiles] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewTitle, setPreviewTitle] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const loadAttachments = async (phieuSecId) => {
        if (!phieuSecId) return;
        try {
            setAttachLoading(true);
            const list = await api.listTaiLieuPhieuSec(phieuSecId);
            setAttachList(list || []);
        } catch (error) {
            console.error(error);
            setToast({
                open: true,
                msg: error?.response?.data?.message || "Lỗi tải tài liệu",
                type: "error",
            });
        } finally {
            setAttachLoading(false);
        }
    };

    const handleAttachFileChange = (event) => {
        setAttachFiles(Array.from(event.target.files || []));
    };

    const handleUploadAttachments = async () => {
        if (!detail?.id) {
            setToast({ open: true, msg: "Chưa có phiếu để gắn tài liệu", type: "warning" });
            return;
        }
        if (!attachFiles.length) {
            setToast({ open: true, msg: "Chọn ít nhất 1 file", type: "warning" });
            return;
        }

        const formData = new FormData();
        attachFiles.forEach((file) => formData.append("files", file));
        formData.append("NguoiTao", user?.fullName || user?.username || user?.id || "system");

        try {
            setAttachUploading(true);
            await api.uploadTaiLieuPhieuSec(detail.id, formData);
            setAttachFiles([]);
            await loadAttachments(detail.id);
            setToast({ open: true, msg: "Đã upload tài liệu", type: "success" });
        } catch (error) {
            console.error(error);
            setToast({
                open: true,
                msg: error?.response?.data?.message || "Upload tài liệu thất bại",
                type: "error",
            });
        } finally {
            setAttachUploading(false);
        }
    };

    const handleViewAttachment = (attachment) => {
        const id = attachment.taiLieuId ?? attachment.TaiLieuId;
        setPreviewTitle(attachment.fileName ?? attachment.FileName ?? "Tài liệu");
        setPreviewUrl(api.getTaiLieuPhieuSecUrl(id));
        setPreviewOpen(true);
    };

    const handleDeleteAttachment = (attachment) => {
        if (!canDelete) {
            setToast({
                open: true,
                msg: "Chỉ admin hoặc người tạo phiếu nháp mới được xoá tài liệu",
                type: "error",
            });
            return;
        }
        setDeleteTarget(attachment);
        setConfirmOpen(true);
    };

    const confirmDeleteAttachment = async () => {
        try {
            if (!canDelete) throw new Error("Chỉ admin hoặc người tạo phiếu nháp mới được xoá tài liệu");
            await api.deleteTaiLieuPhieuSec(deleteTarget?.taiLieuId ?? deleteTarget?.TaiLieuId);
            setToast({ open: true, msg: "Đã xoá tài liệu", type: "success" });
            await loadAttachments(detail?.id);
        } catch (error) {
            console.error(error);
            setToast({ open: true, msg: error?.message || "Xóa thất bại", type: "error" });
        } finally {
            setConfirmOpen(false);
        }
    };

    const resetAttachments = () => {
        setAttachList([]);
        setAttachFiles([]);
    };

    return {
        attachList,
        attachLoading,
        attachUploading,
        attachFiles,
        previewOpen,
        previewUrl,
        previewTitle,
        confirmOpen,
        deleteTarget,
        setPreviewOpen,
        setConfirmOpen,
        loadAttachments,
        handleAttachFileChange,
        handleUploadAttachments,
        handleViewAttachment,
        handleDeleteAttachment,
        confirmDeleteAttachment,
        resetAttachments,
    };
}
