import { Button, Stack, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import CancelIcon from "@mui/icons-material/Cancel";
import { canApproveInvoice, canDeleteInvoice, canEditInvoice, canSubmitInvoice } from "../../utils/hoa-don";

function ButtonWithReason({ disabled, reason, children }) {
    return (
        <Tooltip title={disabled ? reason : ""}>
            <span>{children}</span>
        </Tooltip>
    );
}

export default function HoaDonWorkflowActions({
    invoice,
    auth,
    onEdit,
    onSubmit,
    onApprove,
    onReturn,
    onReject,
    onDelete,
    approveDisabledReason = "",
}) {
    const canEdit = canEditInvoice(invoice, auth);
    const canSubmit = canSubmitInvoice(invoice, auth);
    const canApprove = canApproveInvoice(invoice, auth);
    const approveDisabled = !canApprove || Boolean(approveDisabledReason);
    const canDelete = canDeleteInvoice(invoice, auth);
    const isDraft = invoice?.maTrangThai === "KhoiTao";
    const isApprovalState = ["ChoDuyet_TBP", "ChoXuLy_HoaDon"].includes(invoice?.maTrangThai);
    const isDeletableState = ["KhoiTao", "TuChoi"].includes(invoice?.maTrangThai);

    return (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {isDraft && (
                <ButtonWithReason disabled={!canEdit} reason="Bạn chỉ được sửa hóa đơn nháp do mình tạo hoặc có quyền HD_Admin.">
                    <Button startIcon={<EditIcon />} variant="outlined" disabled={!canEdit} onClick={onEdit}>
                        Sửa nháp
                    </Button>
                </ButtonWithReason>
            )}
            {isDraft && (
                <ButtonWithReason disabled={!canSubmit} reason="Bạn chưa có quyền trình hóa đơn này.">
                    <Button startIcon={<SendIcon />} variant="contained" disabled={!canSubmit} onClick={onSubmit}>
                        Trình duyệt
                    </Button>
                </ButtonWithReason>
            )}
            {isApprovalState && (
                <>
                    <ButtonWithReason disabled={approveDisabled} reason={approveDisabledReason || "Bạn không có quyền duyệt bước hiện tại của hóa đơn này."}>
                        <Button startIcon={<CheckCircleIcon />} color="success" variant="contained" disabled={approveDisabled} onClick={onApprove}>
                            Duyệt
                        </Button>
                    </ButtonWithReason>
                    <ButtonWithReason disabled={!canApprove} reason="Bạn không có quyền trả lại hóa đơn ở bước hiện tại.">
                        <Button startIcon={<KeyboardReturnIcon />} color="warning" variant="outlined" disabled={!canApprove} onClick={onReturn}>
                            Trả lại
                        </Button>
                    </ButtonWithReason>
                    <ButtonWithReason disabled={!canApprove} reason="Bạn không có quyền từ chối hóa đơn ở bước hiện tại.">
                        <Button startIcon={<CancelIcon />} color="error" variant="outlined" disabled={!canApprove} onClick={onReject}>
                            Từ chối
                        </Button>
                    </ButtonWithReason>
                </>
            )}
            {isDeletableState && (
                <ButtonWithReason disabled={!canDelete} reason="Bạn chỉ được xóa hóa đơn nháp/từ chối do mình tạo hoặc có quyền HD_Admin.">
                    <Button startIcon={<DeleteIcon />} color="error" variant="outlined" disabled={!canDelete} onClick={onDelete}>
                        Xóa
                    </Button>
                </ButtonWithReason>
            )}
        </Stack>
    );
}
