"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { light: "#8be7dc", main: "#54d1c2", dark: "#31aa9d" },
    secondary: { light: "#8be7dc", main: "#54d1c2", dark: "#31aa9d" },
    success: { light: "#9ce5c1", main: "#70d2a6", dark: "#3ba77b" },
    warning: { light: "#f5d58c", main: "#f2c66d", dark: "#c99736" },
    error: { light: "#ffaaa5", main: "#e57570", dark: "#ad4946" },
    text: { primary: "#e8f0f1", secondary: "#a7b8bb" },
    divider: "#2b4247",
    background: { default: "#0d171a", paper: "#142226" },
  },
  typography: { fontFamily: "var(--font-sans), sans-serif", button: { textTransform: "none", fontWeight: 500 } },
  shape: { borderRadius: 8 },
  components: {
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, input: { fontWeight: 500 } } },
    MuiTableCell: { styleOverrides: { head: { color: "#e8f0f1", fontWeight: 500 }, root: { borderColor: "#2b4247" } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: "none", border: "1px solid #2b4247" } } },
  },
});

export function BerryTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
