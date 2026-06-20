import { useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

const GUIDE_IMAGES = [
    {
        src: "/assets/image/nh1.jpg",
        alt: "Màn hình nhập số tài khoản và chọn ngân hàng hưởng thụ",
        caption: "Nhập STK và chọn đúng ngân hàng.",
    },
    {
        src: "/assets/image/nh2.jpg",
        alt: "Màn hình app ngân hàng hiển thị tên người nhận",
        caption: "Lấy tên người nhận hiện ra.",
    },
];

export default function BankTransferGuide() {
    const [previewImage, setPreviewImage] = useState(null);

    return (
        <>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2, height: "fit-content" }}>
                <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Cách lấy tên chuyển khoản
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.25 }}>
                        {GUIDE_IMAGES.map((image) => (
                            <Box key={image.src}>
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => setPreviewImage(image)}
                                    sx={{
                                        p: 0,
                                        width: "100%",
                                        aspectRatio: "9 / 14",
                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1.5,
                                        bgcolor: "background.paper",
                                        cursor: "zoom-in",
                                        display: "block",
                                    }}
                                >
                                    <Box
                                        component="img"
                                        alt={image.alt}
                                        src={image.src}
                                        sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                    {image.caption}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    <Stack spacing={1}>
                        {[
                            "Mở app ngân hàng và chọn chuyển tiền.",
                            "Nhập số tài khoản, chọn đúng ngân hàng.",
                            "Đợi app hiện tên người nhận, rồi nhập đúng tên đó vào ô Tên chuyển khoản - IPay.",
                        ].map((text, index) => (
                            <Stack key={text} direction="row" spacing={1} alignItems="flex-start">
                                <Box
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: "50%",
                                        bgcolor: "primary.main",
                                        color: "primary.contrastText",
                                        fontSize: 12,
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        mt: 0.2,
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                <Typography variant="body2" color="text.secondary">{text}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Bấm vào ảnh để xem lớn.
                    </Typography>
                </Stack>
            </Paper>
            <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{previewImage?.caption || "Ảnh hướng dẫn"}</DialogTitle>
                <DialogContent>
                    {previewImage && (
                        <Box
                            component="img"
                            alt={previewImage.alt}
                            src={previewImage.src}
                            sx={{
                                width: "100%",
                                maxHeight: "78vh",
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 1.5,
                                bgcolor: "background.paper",
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewImage(null)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
