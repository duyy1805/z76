import { Button, IconButton, Popover, Stack } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import { useState } from "react";

export default function TableHeaderFilter({ label, active, width = 280, children, onClear, align = "left" }) {
    const [anchorEl, setAnchorEl] = useState(null);

    return (
        <>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={align === "right" ? "flex-end" : "flex-start"} sx={{ whiteSpace: "nowrap" }}>
                <span>{label}</span>
                <IconButton size="small" color={active ? "primary" : "default"} onClick={(event) => setAnchorEl(event.currentTarget)} aria-label={`Lọc ${label}`}>
                    <FilterListRoundedIcon fontSize="inherit" />
                </IconButton>
            </Stack>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: align }}
                transformOrigin={{ vertical: "top", horizontal: align }}
                PaperProps={{ sx: { p: 1.5, width } }}
            >
                <Stack spacing={1.25}>
                    {children}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {active && <Button startIcon={<ClearIcon />} size="small" onClick={onClear}>Xóa</Button>}
                        <Button variant="contained" size="small" onClick={() => setAnchorEl(null)}>OK</Button>
                    </Stack>
                </Stack>
            </Popover>
        </>
    );
}
