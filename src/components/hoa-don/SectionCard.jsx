import { Box, Paper, Stack, Typography } from "@mui/material";

export default function SectionCard({ title, subtitle, action, children, sx }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.75, md: 2.25 },
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                ...sx,
            }}
        >
            {(title || action) && (
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontSize: "1rem" }}>{title}</Typography>
                        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>{subtitle}</Typography>}
                    </Box>
                    {action}
                </Stack>
            )}
            {children}
        </Paper>
    );
}
