import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Box, Divider, Tooltip, Paper, BottomNavigation,
    BottomNavigationAction
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const { user, logout, role: ctxRole } = useAuth(); // lấy role nếu store có
    const [collapsed, setCollapsed] = useState(false);
    const drawerCollapsed = !isMobile && collapsed;
    const drawerWidth = drawerCollapsed ? MINI_WIDTH : OPEN_WIDTH;

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

    const handleNavigate = (path) => {
        navigate(path);
    };

    const bottomNavValue = menuItems.some((item) => item.path === location.pathname)
        ? location.pathname
        : false;

    const bottomNavLabel = (text) => {
        if (text === "Phiếu séc VND") return "VND";
        if (text === "Phiếu séc ngoại tệ") return "Ngoại tệ";
        if (text === "Admin · Lookup") return "Admin";
        return text;
    };

    const fullName = user?.fullName || user?.name || "User";
    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
            <Toolbar sx={{ px: 2, justifyContent: "center" }}>
                {drawerCollapsed ? (
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
                            onClick={() => handleNavigate(item.path)}
                            selected={location.pathname === item.path}
                            sx={{
                                minHeight: 48,
                                px: drawerCollapsed ? 2.5 : 2,
                                justifyContent: drawerCollapsed ? "center" : "initial",
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
                            <ListItemIcon sx={{ minWidth: 0, mr: drawerCollapsed ? 0 : 2, justifyContent: "center" }}>
                                {item.icon}
                            </ListItemIcon>
                            {!drawerCollapsed && <ListItemText primary={item.text} />}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {!isMobile && (
                <>
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
                        <Tooltip title={drawerCollapsed ? "Mở rộng" : "Thu gọn"} placement="top">
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
                                {drawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                            </Box>
                        </Tooltip>
                    </Box>
                </>
            )}
        </Box>
    );

    return (
        <Box sx={{ display: "flex", width: "100%", minHeight: "100vh", overflowX: "hidden" }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
                    ml: { xs: 0, md: `${drawerWidth}px` },
                    transition: (t) =>
                        t.transitions.create(["margin-left", "width"], {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest,
                        }),
                }}
            >
                <Toolbar sx={{ gap: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        noWrap
                        sx={{ flexGrow: 1, minWidth: 0, fontSize: { xs: "1rem", sm: "1.25rem" } }}
                    >
                        Quản lý sổ séc
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        {!isMobile && !drawerCollapsed && (
                            <Typography variant="body2" noWrap sx={{ lineHeight: 1.2, textAlign: "right", maxWidth: 220 }}>
                                <strong>{fullName}</strong>
                            </Typography>
                        )}

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
                    display: { xs: "none", md: "block" },
                    width: { xs: 0, md: drawerWidth },
                    flexShrink: 0,
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
                    width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    p: { xs: 1.5, sm: 2, md: 3 },
                    pb: { xs: 10, md: 3 },
                    ml: 0,
                    transition: (t) =>
                        t.transitions.create("width", {
                            easing: t.transitions.easing.sharp,
                            duration: t.transitions.duration.shortest,
                        }),
                }}
            >
                <Toolbar />
                {children}
            </Box>

            <Paper
                elevation={8}
                sx={{
                    display: { xs: "block", md: "none" },
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: (t) => t.zIndex.appBar,
                    borderTop: (t) => `1px solid ${t.palette.divider}`,
                }}
            >
                <BottomNavigation
                    showLabels
                    value={bottomNavValue}
                    onChange={(_, value) => handleNavigate(value)}
                    sx={{
                        height: 64,
                        "& .MuiBottomNavigationAction-root": {
                            minWidth: 0,
                            px: 0.5,
                        },
                        "& .MuiBottomNavigationAction-label": {
                            fontSize: "0.68rem",
                            whiteSpace: "nowrap",
                        },
                    }}
                >
                    {menuItems.map((item) => (
                        <BottomNavigationAction
                            key={item.path}
                            label={bottomNavLabel(item.text)}
                            value={item.path}
                            icon={item.icon}
                        />
                    ))}
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
