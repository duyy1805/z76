import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
    AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Box, Divider, Tooltip, Avatar, Chip
} from "@mui/material";

import TimelineIcon from "@mui/icons-material/Timeline";
import TableChartIcon from "@mui/icons-material/TableChart";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";

import { useAuth } from "../../store/useAuth";

const MINI_WIDTH = 72;
const OPEN_WIDTH = 240;

export default function Shell_TGSX({ children }) {
    const navigate = useNavigate();
    const location = useLocation();

    const { user_tgsx, logoutTGSX } = useAuth();

    const [collapsed, setCollapsed] = useState(false);
    const drawerWidth = collapsed ? MINI_WIDTH : OPEN_WIDTH;

    // Thông tin người dùng
    const fullName = user_tgsx?.fullName || user_tgsx?.name || "User";
    const position = user_tgsx?.tenChucVu || "";
    const department = user_tgsx?.tenBoPhan || "";

    const initials = (fullName || "U")
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(-2)
        .toUpperCase();

    // MENU TGSX
    const menuItems = [
        { text: "Định mức lao động", icon: <TableChartIcon />, path: "/tgsx/dinhmuc" },
        { text: "Thời gian sản xuất", icon: <TimelineIcon />, path: "/tgsx/thoigian" },
    ];

    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
            <Toolbar sx={{ px: 2, justifyContent: collapsed ? "center" : "flex-start" }}>
                {collapsed ? (
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>TGSX</Typography>
                ) : (
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Tính thời gian SX</Typography>
                )}
            </Toolbar>

            <Divider />

            {/* Menu */}
            <List sx={{ flex: 1 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            onClick={() => navigate(item.path)}
                            selected={location.pathname === item.path}
                            sx={{
                                "&.Mui-selected": {
                                    bgcolor: "primary.main",
                                    color: "primary.contrastText",
                                    "&:hover": { bgcolor: "primary.dark" }
                                },
                                "& .MuiListItemIcon-root": {
                                    color: location.pathname === item.path ? "inherit" : "text.secondary"
                                }
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            {!collapsed && <ListItemText primary={item.text} />}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Divider />

            {/* Nút thu gọn / mở rộng */}
            <Tooltip title={collapsed ? "Mở rộng" : "Thu gọn"}>
                <Box
                    onClick={() => setCollapsed((v) => !v)}
                    sx={{
                        width: "100%",
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" }
                    }}
                >
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </Box>
            </Tooltip>
        </Box>
    );

    return (
        <Box sx={{ display: "flex" }}>

            {/* ================= APP BAR ================= */}
            <AppBar
                position="fixed"
                sx={{
                    width: `calc(100% - ${drawerWidth}px)`,
                    ml: `${drawerWidth}px`,
                    transition: (t) =>
                        t.transitions.create(["margin-left", "width"], {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest
                        }),
                }}
            >
                <Toolbar sx={{ gap: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Tính thời gian sản xuất
                    </Typography>

                    {/* Khi không collapsed thì hiện thông tin chi tiết */}
                    {!collapsed && (
                        <>
                            <Typography variant="body2" sx={{ textAlign: "right", lineHeight: 1.2 }}>
                                <strong>{fullName}</strong>
                                <br />
                                <span style={{ opacity: 0.7 }}>
                                    {department}
                                </span>
                            </Typography>

                            <Chip
                                size="small"
                                label={position || "Nhân viên"}
                                color="default"
                            />
                        </>
                    )}

                    <Avatar sx={{ width: 32, height: 32 }}>{initials}</Avatar>

                    <Tooltip title="Đăng xuất">
                        <IconButton color="inherit" onClick={logoutTGSX}>
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* ================= SIDEBAR ================= */}
            <Drawer
                variant="permanent"
                open
                sx={{
                    "& .MuiDrawer-paper": {
                        width: drawerWidth,
                        overflowX: "hidden",
                        whiteSpace: "nowrap",
                        boxSizing: "border-box",
                        transition: (t) =>
                            t.transitions.create("width", {
                                easing: t.transitions.easing.sharp,
                                duration: t.transitions.duration.shortest
                            }),
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* ================= NỘI DUNG CHÍNH ================= */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: `${drawerWidth}px`,
                    transition: (t) =>
                        t.transitions.create("margin-left", {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest
                        }),
                }}
            >
                <Toolbar /> {/* tránh AppBar đè nội dung */}
                {children}
            </Box>
        </Box>
    );
}
