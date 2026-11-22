"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppBar, Avatar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { AudioLines, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { canAccessSection } from "@/lib/permissions";
import type { PortalData } from "@/lib/types";
import { api, pages } from "./portal";

type Account = Pick<PortalData, "business_name" | "display_name" | "email" | "is_admin" | "read_only" | "allowed_tools">;

const AccountContext = createContext<Account | null>(null);
export const useAccount = () => useContext(AccountContext)!;

export function PortalShell({ account, children }: { account: Account; children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const preference = localStorage.getItem("portal-theme");
    const enabled = preference ? preference === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", enabled);
    const frame = requestAnimationFrame(() => setDark(enabled));
    return () => cancelAnimationFrame(frame);
  }, []);
  const toggleTheme = () => {
    const enabled = !dark;
    setDark(enabled);
    localStorage.setItem("portal-theme", enabled ? "dark" : "light");
    document.documentElement.classList.toggle("dark", enabled);
  };
  const section = usePathname().split("/")[1];
  const nav = pages.filter(page => canAccessSection(account, page.href)).map(page => account.is_admin ? { ...page, group: "Administration" } : page);
  const page = pages.find(item => item.href === section);
  const title = section === "dashboard" && account.read_only ? "Call history" : page?.label || "Workspace";
  const initials = (account.display_name || account.business_name).charAt(0).toUpperCase();
  const navigation = <Box sx={{ width: 260, height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Link className="berry-brand" href="/dashboard"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</Link><IconButton aria-label="Close navigation" onClick={() => setMobile(false)} sx={{ display: { md: "none" } }}><X size={20} /></IconButton></Box>
    <Box className="berry-workspace"><Avatar sx={{ bgcolor: "secondary.light", color: "secondary.dark", width: 38, height: 38 }}>{account.business_name.charAt(0)}</Avatar><Box><strong>{account.is_admin ? "Administration" : account.business_name}</strong><small>{account.is_admin ? "Portal oversight" : account.read_only ? "View-only workspace" : "Your workspace"}</small></Box></Box>
    {["Daily work", "Setup", "Administration"].map(group => {
      const items = nav.filter(item => item.group === group);
      return items.length > 0 && <Box component="nav" aria-label={group} key={group} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: "text.primary", fontWeight: 600, px: 1.5, mb: 1 }}>{group}</Typography>
        <List disablePadding>{items.map(item => <ListItemButton key={item.href} component={Link} href={`/${item.href}`} selected={section === item.href} aria-current={section === item.href ? "page" : undefined} onClick={() => setMobile(false)} sx={{ borderRadius: 2, mb: .5, py: 1, color: "var(--portal-muted)", transition: "color 140ms ease, background-color 140ms ease", "&:hover": { backgroundColor: "var(--portal-accent-hover)", color: "var(--portal-text)" }, "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "var(--portal-accent-soft)", color: "var(--portal-accent)" }, "&.Mui-selected .MuiListItemIcon-root": { color: "inherit" }, "&:focus-visible": { outline: "2px solid var(--portal-accent)", outlineOffset: "2px" } }}>
          <ListItemIcon sx={{ minWidth: 38 }}><item.icon size={19} /></ListItemIcon><ListItemText primary={item.href === "dashboard" && account.read_only ? "Call history" : item.label} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }} />
        </ListItemButton>)}</List>
      </Box>;
    })}
    <Box className="berry-user"><Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", width: 36, height: 36 }}>{initials}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><strong>{account.display_name || "Workspace member"}</strong><small>{account.email}</small></Box><IconButton aria-label="Sign out" size="small" onClick={async () => { try { await api("logout", "POST"); window.location.href = "/login"; } catch (e) { setError((e as Error).message); } }}><LogOut size={18} /></IconButton></Box>
  </Box>;
  return <AccountContext.Provider value={account}><Box className="berry-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <AppBar position="fixed" color="inherit" elevation={0} className="berry-appbar"><Toolbar className="berry-toolbar"><IconButton aria-label="Open navigation" onClick={() => setMobile(true)} sx={{ display: { md: "none" }, mr: 1 }}><Menu size={21} /></IconButton><Typography variant="body2" color="text.secondary">{account.is_admin ? "Administration" : account.business_name} / <strong>{title}</strong></Typography><IconButton className="theme-toggle" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`} onClick={toggleTheme}>{dark ? <Sun size={19} /> : <Moon size={19} />}</IconButton></Toolbar></AppBar>
    <Drawer variant="permanent" open sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: 260, border: 0 } }}>{navigation}</Drawer>
    <Drawer variant="temporary" open={mobile} onClose={() => setMobile(false)} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: 260 } }}>{navigation}</Drawer>
    <Box component="main" id="main-content" className="berry-main">{error && <div role="alert">{error}</div>}{children}</Box>
  </Box></AccountContext.Provider>;
}
