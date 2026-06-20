import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AppBar,
    Avatar,
    BottomNavigation,
    BottomNavigationAction,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
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
    const { user, logout, role: contextRole } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const drawerCollapsed = !isMobile && collapsed;
    const drawerWidth = drawerCollapsed ? MINI_WIDTH : OPEN_WIDTH;
    const roleCode = (contextRole || user?.roleCode || user?.role || "").toString();
    const canSeeAdmin = ["GD", "Admin"].includes(roleCode);

    const menuItems = useMemo(() => {
        const items = [
            { text: "Dashboard", shortText: "Tổng quan", icon: <DashboardIcon />, path: "/dashboard" },
            { text: "Phiếu séc VND", shortText: "VND", icon: <LibraryBooksIcon />, path: "/phieu-vnd" },
            { text: "Phiếu séc ngoại tệ", shortText: "Ngoại tệ", icon: <LibraryBooksIcon />, path: "/phieu-ngoai-te" },
        ];
        if (canSeeAdmin) {
            items.push({ text: "Danh mục quản trị", shortText: "Admin", icon: <AdminPanelSettingsIcon />, path: "/admin" });
        }
        return items;
    }, [canSeeAdmin]);

    const bottomNavValue = menuItems.some((item) => item.path === location.pathname)
        ? location.pathname
        : false;
    const fullName = user?.fullName || user?.name || "Người dùng";
    const initials = fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
    const roleLabel = {
        Admin: "Quản trị viên",
        GD: "Giám đốc",
        KTT: "Kế toán trưởng",
        TBP: "Trưởng bộ phận",
        NhanVien: "Nhân viên",
    }[roleCode] || roleCode || "Nhân viên";

    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#0B1739", color: "white" }}>
            <Toolbar sx={{ px: 2, justifyContent: drawerCollapsed ? "center" : "flex-start", minHeight: "72px !important" }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        component="img"
                        src="/assets/image/logo.jpg"
                        alt="Logo Z76"
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            objectFit: "cover",
                            bgcolor: "white",
                            border: "1px solid rgba(255,255,255,.18)",
                            boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                            flexShrink: 0,
                        }}
                    />
                    {!drawerCollapsed && (
                        <Box>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>Z76</Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.58)" }}>Sổ séc điện tử</Typography>
                        </Box>
                    )}
                </Stack>
            </Toolbar>
            <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

            <List sx={{ flex: 1, px: 1.25, py: 2 }}>
                {menuItems.map((item) => {
                    const selected = location.pathname === item.path;
                    return (
                        <ListItem key={item.path} disablePadding>
                            <Tooltip title={drawerCollapsed ? item.text : ""} placement="right">
                                <ListItemButton
                                    onClick={() => navigate(item.path)}
                                    selected={selected}
                                    sx={{
                                        minHeight: 44,
                                        px: drawerCollapsed ? 1.25 : 1.5,
                                        mb: 0.5,
                                        borderRadius: 2,
                                        justifyContent: drawerCollapsed ? "center" : "initial",
                                        color: "rgba(255,255,255,.7)",
                                        "&.Mui-selected": {
                                            bgcolor: "rgba(255,255,255,.12)",
                                            color: "#FFFFFF",
                                            "&:hover": { bgcolor: "rgba(255,255,255,.16)" },
                                        },
                                        "&:hover": { bgcolor: "rgba(255,255,255,.07)", color: "#FFFFFF" },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 0, mr: drawerCollapsed ? 0 : 1.5, justifyContent: "center", color: "inherit" }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    {!drawerCollapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 700 : 550 }} />}
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    );
                })}
            </List>

            {!isMobile && (
                <Box sx={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <Tooltip title={drawerCollapsed ? "Mở rộng" : "Thu gọn"} placement="top">
                        <Box
                            onClick={() => setCollapsed((value) => !value)}
                            sx={{
                                width: "100%",
                                height: 48,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "rgba(255,255,255,.65)",
                                "&:hover": { bgcolor: "rgba(255,255,255,.07)", color: "white" },
                            }}
                        >
                            {drawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </Box>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );

    return (
        <Box sx={{ display: "flex", width: "100%", minHeight: "100vh", overflowX: "hidden" }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
                    ml: { xs: 0, md: `${drawerWidth}px` },
                    bgcolor: "rgba(255,255,255,.94)",
                    color: "text.primary",
                    backdropFilter: "blur(12px)",
                    borderBottom: (currentTheme) => `1px solid ${currentTheme.palette.divider}`,
                    transition: (currentTheme) => currentTheme.transitions.create(["margin-left", "width"]),
                }}
            >
                <Toolbar sx={{ gap: 1, minWidth: 0, minHeight: "64px !important", px: { xs: 2, md: 3 } }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
                            Quản lý phiếu séc
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                            Theo dõi, phê duyệt và quản lý lệnh chi
                        </Typography>
                    </Box>

                    <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                            p: 0.5,
                            pl: { xs: 0.5, md: 0.75 },
                            borderRadius: 2.5,
                            border: (currentTheme) => `1px solid ${currentTheme.palette.divider}`,
                            bgcolor: "background.paper",
                            boxShadow: "0 1px 2px rgba(16,24,40,.04)",
                        }}
                    >
                        {!isMobile && (
                            <Stack direction="row" spacing={1.1} alignItems="center" sx={{ pr: drawerCollapsed ? 0.5 : 1.25 }}>
                                <Avatar
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        background: "linear-gradient(145deg, #EAF1FF, #DCE7FF)",
                                        color: "primary.dark",
                                        fontSize: 13,
                                        fontWeight: 850,
                                        border: "1px solid rgba(21,94,239,.1)",
                                    }}
                                >
                                    {initials}
                                </Avatar>
                                {!drawerCollapsed && (
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{ lineHeight: 1.25, maxWidth: 180, fontWeight: 800, color: "text.primary" }}
                                        >
                                            {fullName}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            noWrap
                                            sx={{ display: "block", maxWidth: 180, color: "text.secondary", lineHeight: 1.35 }}
                                        >
                                            {roleLabel}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        )}

                        {!isMobile && <Divider orientation="vertical" flexItem sx={{ my: 0.35 }} />}

                        <Tooltip title="Đăng xuất khỏi hệ thống">
                            <IconButton
                                onClick={logout}
                                aria-label="Đăng xuất"
                                sx={{
                                    width: 38,
                                    height: 38,
                                    ml: { xs: 0, md: 0.5 },
                                    color: "text.secondary",
                                    "&:hover": {
                                        color: "error.main",
                                        bgcolor: "#FEF3F2",
                                    },
                                }}
                            >
                                <LogoutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
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
                        overflowX: "hidden",
                        boxSizing: "border-box",
                        borderRight: 0,
                        bgcolor: "#0B1739",
                        transition: (currentTheme) => currentTheme.transitions.create("width"),
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
                    height: { md: "100vh" },
                    width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
                    maxWidth: "100%",
                    p: { xs: 1.25, sm: 2, md: 2.5 },
                    pb: { xs: 10, md: 3 },
                    overflow: { xs: "visible", md: "hidden" },
                    boxSizing: "border-box",
                    transition: (currentTheme) => currentTheme.transitions.create("width"),
                }}
            >
                <Toolbar sx={{ minHeight: "64px !important" }} />
                {children}
            </Box>

            <Paper
                elevation={8}
                sx={{
                    display: { xs: "block", md: "none" },
                    position: "fixed",
                    left: 8,
                    right: 8,
                    bottom: 8,
                    zIndex: (currentTheme) => currentTheme.zIndex.appBar,
                    border: (currentTheme) => `1px solid ${currentTheme.palette.divider}`,
                    borderRadius: 3,
                    overflow: "hidden",
                }}
            >
                <BottomNavigation
                    showLabels
                    value={bottomNavValue}
                    onChange={(_, value) => navigate(value)}
                    sx={{
                        height: 62,
                        "& .MuiBottomNavigationAction-root": { minWidth: 0, px: 0.5 },
                        "& .MuiBottomNavigationAction-label": { fontSize: "0.68rem", whiteSpace: "nowrap" },
                    }}
                >
                    {menuItems.map((item) => (
                        <BottomNavigationAction key={item.path} label={item.shortText} value={item.path} icon={item.icon} />
                    ))}
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
