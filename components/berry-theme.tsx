"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { light: "#e4f4f1", main: "#167d74", dark: "#0f6a62" },
    secondary: { light: "#e4f4f1", main: "#167d74", dark: "#0f6a62" },
    text: { primary: "#152326", secondary: "#5e7277" },
    divider: "#dde7e8",
    background: { default: "#f3f7f7", paper: "#fff" },
  },
  typography: { fontFamily: "var(--font-sans), sans-serif", button: { textTransform: "none", fontWeight: 500 } },
  shape: { borderRadius: 8 },
  components: {
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, input: { fontWeight: 500 } } },
    MuiTableCell: { styleOverrides: { head: { color: "#152326", fontWeight: 500 }, root: { borderColor: "#dde7e8" } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: "none", border: "1px solid #dde7e8" } } },
  },
});

export function BerryTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
