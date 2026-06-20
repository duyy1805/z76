import { Box, IconButton, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import SendIcon from "@mui/icons-material/Send";
import { ACTION_BUTTON_COUNT, ACTION_BUTTON_SIZE } from "../../utils/phieu-sec";

export default function PhieuSecActions({
    phieu,
    canEdit,
    canReturn,
    canSubmit,
    canApprove,
    canReject,
    canDelete,
    submitting,
    onEdit,
    onReturn,
    onSubmit,
    onApprove,
    onReject,
    onDelete,
}) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${ACTION_BUTTON_COUNT}, ${ACTION_BUTTON_SIZE}px)`,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Box sx={{ visibility: canEdit || canReturn ? "visible" : "hidden" }}>
                {canEdit ? (
                    <IconButton color="primary" onClick={(event) => onEdit(phieu, event)} aria-label="Sửa phiếu">
                        <EditIcon />
                    </IconButton>
                ) : (
                    <Tooltip title="Trả lại để chỉnh sửa">
                        <IconButton color="warning" onClick={(event) => onReturn(phieu, event)} aria-label="Trả lại phiếu">
                            <KeyboardReturnIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {canSubmit ? (
                <Tooltip title="Trình TBP">
                    <span>
                        <IconButton
                            color="success"
                            disabled={submitting}
                            onClick={(event) => onSubmit(phieu, event)}
                            aria-label="Trình TBP"
                        >
                            <SendIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            ) : (
                <span>
                    <IconButton
                        color="success"
                        disabled={!canApprove}
                        onClick={(event) => onApprove(phieu, event)}
                        aria-label="Duyệt phiếu"
                    >
                        <CheckCircleIcon />
                    </IconButton>
                </span>
            )}

            <span>
                <IconButton
                    color="error"
                    disabled={!canReject}
                    onClick={(event) => onReject(phieu, event)}
                    aria-label="Từ chối phiếu"
                >
                    <CancelIcon />
                </IconButton>
            </span>

            <Box sx={{ visibility: canDelete ? "visible" : "hidden" }}>
                <Tooltip title="Xoá phiếu">
                    <IconButton color="error" onClick={(event) => onDelete(phieu, event)} aria-label="Xoá phiếu">
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}
