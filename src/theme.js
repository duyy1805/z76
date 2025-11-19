import { createTheme } from "@mui/material";

const theme = createTheme({
    palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#9c27b0" },
        background: { default: "#f7f9fc" }
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: "none" } } }
    }
});

export default theme;
