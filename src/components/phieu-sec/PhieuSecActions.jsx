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
    const actionSx = {
        width: 32,
        height: 32,
        "&.Mui-disabled": {
            color: "#D0D5DD",
            bgcolor: "transparent",
        },
    };

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
                    <IconButton color="primary" sx={actionSx} onClick={(event) => onEdit(phieu, event)} aria-label="Sửa phiếu">
                        <EditIcon fontSize="small" />
                    </IconButton>
                ) : (
                    <Tooltip title="Trả lại để chỉnh sửa">
                        <IconButton color="warning" sx={actionSx} onClick={(event) => onReturn(phieu, event)} aria-label="Trả lại phiếu">
                            <KeyboardReturnIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {canSubmit ? (
                <Tooltip title="Trình TBP">
                    <span>
                        <IconButton
                            color="success"
                            sx={actionSx}
                            disabled={submitting}
                            onClick={(event) => onSubmit(phieu, event)}
                            aria-label="Trình TBP"
                        >
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            ) : (
                <span>
                    <IconButton
                        color="success"
                        sx={actionSx}
                        disabled={!canApprove}
                        onClick={(event) => onApprove(phieu, event)}
                        aria-label="Duyệt phiếu"
                    >
                        <CheckCircleIcon fontSize="small" />
                    </IconButton>
                </span>
            )}

            <span>
                <IconButton
                    color="error"
                    sx={actionSx}
                    disabled={!canReject}
                    onClick={(event) => onReject(phieu, event)}
                    aria-label="Từ chối phiếu"
                >
                    <CancelIcon fontSize="small" />
                </IconButton>
            </span>

            <Box sx={{ visibility: canDelete ? "visible" : "hidden" }}>
                <Tooltip title="Xoá phiếu">
                    <IconButton color="error" sx={actionSx} onClick={(event) => onDelete(phieu, event)} aria-label="Xoá phiếu">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}
