import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Box, Divider, Tooltip, Chip, Avatar
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "../../store/useAuth";

const MINI_WIDTH = 72;
const OPEN_WIDTH = 240;

export default function Shell({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, role: ctxRole } = useAuth(); // lấy role nếu store có
    const [collapsed, setCollapsed] = useState(false);
    const drawerWidth = collapsed ? MINI_WIDTH : OPEN_WIDTH;

    // roleCode ưu tiên từ context, fallback từ user
    const roleCode = (ctxRole || user?.roleCode || user?.role || "").toString();
    const canSeeAdmin = useMemo(() => ["GD", "Admin"].includes(roleCode), [roleCode]);

    // dựng menu theo quyền
    const menuItems = useMemo(() => {
        const base = [
            { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
            { text: "Phiếu séc VND", icon: <LibraryBooksIcon />, path: "/phieu-vnd" },
            { text: "Phiếu séc ngoại tệ", icon: <LibraryBooksIcon />, path: "/phieu-ngoai-te" },
        ];
        if (canSeeAdmin) {
            base.push({ text: "Admin · Lookup", icon: <AdminPanelSettingsIcon />, path: "/admin" });
        }
        return base;
    }, [canSeeAdmin]);

    const fullName = user?.fullName || user?.name || "User";
    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
            <Toolbar sx={{ px: 2, justifyContent: "center" }}>
                {collapsed ? (
                    <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>Z76</Typography>
                ) : (
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Sổ séc điện tử</Typography>
                )}
            </Toolbar>

            <Divider />

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
                                    "&:hover": { bgcolor: "primary.dark" },
                                },
                                "& .MuiListItemIcon-root": {
                                    color: location.pathname === item.path ? "inherit" : "text.secondary",
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            {!collapsed && <ListItemText primary={item.text} />}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Divider />

            <Box
                sx={{
                    position: "sticky",
                    bottom: 0,
                    p: 0,
                    borderTop: (t) => `1px solid ${t.palette.divider}`,
                    bgcolor: "background.paper",
                }}
            >
                <Tooltip title={collapsed ? "Mở rộng" : "Thu gọn"} placement="top">
                    <Box
                        onClick={() => setCollapsed((v) => !v)}
                        sx={{
                            width: "100%",
                            height: 48,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            "&:hover": { bgcolor: "action.hover" },
                        }}
                    >
                        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </Box>
                </Tooltip>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", width: "100%", overflowX: "hidden" }}>
            <AppBar
                position="fixed"
                sx={{
                    width: `calc(100% - ${drawerWidth}px)`,
                    ml: `${drawerWidth}px`,
                    transition: (t) =>
                        t.transitions.create(["margin-left", "width"], {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest,
                        }),
                }}
            >
                <Toolbar sx={{ gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>Quản lý sổ séc</Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {!collapsed && (
                            <>
                                <Typography variant="body2" sx={{ lineHeight: 1.2, textAlign: "right" }}>
                                    <strong>{fullName}</strong>
                                    <br />
                                </Typography>
                            </>
                        )}
                        {/* <Avatar sx={{ width: 32, height: 32 }}>{initials}</Avatar> */}

                        <Tooltip title="Đăng xuất">
                            <IconButton color="inherit" onClick={logout}>
                                <LogoutIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                open
                sx={{
                    "& .MuiDrawer-paper": {
                        position: "fixed",
                        top: 0,
                        left: 0,
                        height: "100vh",
                        width: drawerWidth,
                        whiteSpace: "nowrap",
                        overflowX: "hidden",
                        boxSizing: "border-box",
                        borderRight: 0,
                        transition: (t) =>
                            t.transitions.create("width", {
                                easing: t.transitions.easing.sharp,
                                duration: t.transitions.duration.shortest,
                            }),
                    },
                }}
            >
                {drawer}
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    width: `calc(100% - ${drawerWidth}px)`,
                    maxWidth: `calc(100% - ${drawerWidth}px)`,
                    boxSizing: "border-box",
                    p: 3,
                    ml: `${drawerWidth}px`,
                    transition: (t) =>
                        t.transitions.create("margin-left", {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest,
                        }),
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}
