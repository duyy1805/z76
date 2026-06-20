import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import { BufferedTextField } from "./fields/PaymentFields";

export default function WorkflowDialogs({
    deleteState,
    rejectState,
    returnState,
}) {
    return (
        <>
            <Dialog
                open={deleteState.open}
                onClose={() => !deleteState.submitting && deleteState.onClose()}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Xoá phiếu</DialogTitle>
                <DialogContent>
                    <Stack spacing={1}>
                        <Typography>
                            Bạn có chắc muốn xoá phiếu <b>{deleteState.target?.maSoSec || (deleteState.target ? `SS-${deleteState.target.id}` : "")}</b>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phiếu sẽ được ẩn khỏi danh sách, dữ liệu lịch sử và tài liệu vẫn được giữ trong hệ thống.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={deleteState.onClose} disabled={deleteState.submitting}>Huỷ</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={deleteState.onConfirm}
                        disabled={deleteState.submitting}
                    >
                        {deleteState.submitting ? "Đang xoá..." : "Xoá phiếu"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={rejectState.open}
                onClose={() => !rejectState.submitting && rejectState.onClose()}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Từ chối phiếu</DialogTitle>
                <DialogContent>
                    <BufferedTextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        margin="dense"
                        label="Lý do từ chối"
                        value={rejectState.reason}
                        onCommit={rejectState.onReasonChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={rejectState.onClose} disabled={rejectState.submitting}>Hủy</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={rejectState.onConfirm}
                        disabled={rejectState.submitting || !rejectState.reason.trim()}
                    >
                        {rejectState.submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={returnState.open}
                onClose={() => !returnState.submitting && returnState.onClose()}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Trả lại phiếu để chỉnh sửa</DialogTitle>
                <DialogContent>
                    <BufferedTextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        margin="dense"
                        label="Lý do trả lại"
                        value={returnState.reason}
                        onCommit={returnState.onReasonChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={returnState.onClose} disabled={returnState.submitting}>Hủy</Button>
                    <Button
                        color="warning"
                        variant="contained"
                        onClick={returnState.onConfirm}
                        disabled={returnState.submitting || !returnState.reason.trim()}
                    >
                        {returnState.submitting ? "Đang xử lý..." : "Xác nhận trả lại"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
