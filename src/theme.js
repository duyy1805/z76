import { alpha, createTheme } from "@mui/material";

const primary = "#155EEF";

const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: primary,
            dark: "#0B4DD8",
            light: "#EAF1FF",
            contrastText: "#FFFFFF",
        },
        secondary: { main: "#475467" },
        success: { main: "#169B62", dark: "#087443" },
        warning: { main: "#E47A11", dark: "#B54708" },
        error: { main: "#D92D20", dark: "#B42318" },
        info: { main: "#2970FF" },
        background: {
            default: "#F5F7FB",
            paper: "#FFFFFF",
        },
        text: {
            primary: "#101828",
            secondary: "#667085",
        },
        divider: "#E4E7EC",
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        h5: { fontWeight: 750, letterSpacing: "-0.025em" },
        h6: { fontWeight: 700, letterSpacing: "-0.015em" },
        button: { fontWeight: 650 },
    },
    shape: { borderRadius: 10 },
    shadows: [
        "none",
        "0 1px 2px rgba(16,24,40,.05)",
        "0 2px 6px rgba(16,24,40,.06)",
        "0 4px 10px rgba(16,24,40,.07)",
        "0 8px 18px rgba(16,24,40,.08)",
        ...Array(20).fill("0 12px 28px rgba(16,24,40,.10)"),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: { backgroundColor: "#F5F7FB" },
                "*::selection": { backgroundColor: alpha(primary, 0.18) },
            },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    textTransform: "none",
                    borderRadius: 9,
                    minHeight: 38,
                    paddingInline: 14,
                },
                containedPrimary: {
                    boxShadow: "0 1px 2px rgba(16,24,40,.08), 0 4px 10px rgba(21,94,239,.18)",
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    transition: "background-color .15s ease, color .15s ease, transform .15s ease",
                    "&:active": { transform: "scale(.96)" },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                rounded: { borderRadius: 12 },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 9,
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#98A2B3" },
                    "&.Mui-focused": {
                        boxShadow: `0 0 0 3px ${alpha(primary, 0.1)}`,
                    },
                },
                notchedOutline: { borderColor: "#D0D5DD" },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottomColor: "#EAECF0",
                    color: "#344054",
                },
                head: {
                    color: "#475467",
                    fontSize: "0.76rem",
                    fontWeight: 750,
                    letterSpacing: "0.025em",
                    textTransform: "uppercase",
                    backgroundColor: "#F8FAFC",
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius: 7,
                    fontSize: "0.75rem",
                    backgroundColor: "#101828",
                },
            },
        },
    },
});

export default theme;
