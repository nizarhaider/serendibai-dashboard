"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { light: "#e3f2fd", main: "#2196f3", dark: "#1e88e5" },
    secondary: { light: "#ede7f6", main: "#673ab7", dark: "#5e35b1" },
    text: { primary: "#364152", secondary: "#697586" },
    divider: "#e3e8ef",
    background: { default: "#eef2f6", paper: "#fff" },
  },
  typography: { fontFamily: "var(--font-sans), sans-serif", button: { textTransform: "none", fontWeight: 500 } },
  shape: { borderRadius: 8 },
  components: {
    MuiListItemButton: { styleOverrides: { root: { "&.Mui-selected, &.Mui-selected:hover": { color: "#5e35b1", backgroundColor: "#ede7f6" }, "&.Mui-selected .MuiListItemIcon-root": { color: "#5e35b1" }, "&:hover": { backgroundColor: "#ede7f6", color: "#5e35b1" } } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, input: { fontWeight: 500 } } },
    MuiTableCell: { styleOverrides: { head: { color: "#121926", fontWeight: 500 }, root: { borderColor: "#e3e8ef" } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: "none", border: "1px solid #e3e8ef" } } },
  },
});

export function BerryTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
