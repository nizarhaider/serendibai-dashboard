"use client";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import { useCallback, useState, useRef } from "react";
import { AppBar, Avatar, Box, Card, Chip, Dialog, DialogContent, DialogTitle, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Box as BoxIcon,
  CalendarDays,
  Check,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneOutgoing,
  PackageCheck,
  RefreshCw,
  Users,
  X,
  Ticket,
} from "lucide-react";
import type { PortalData, Customer } from "@/lib/types";
import { canAccessSection } from "@/lib/permissions";
import { Customers } from "./customers";
import { CallHistory } from "./call-history";
import { Resources } from "./resources";
import { Agents } from "./agents";
import { Appointments } from "./appointments";
import { Orders } from "./orders";
import { Tickets } from "./tickets";
import { Outbound } from "./outbound";
import { Connections } from "./onboarding";
import { AdminOverview } from "./admin-overview";

export async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/portal/${path}`, {
    method,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    window.location.href = "/login";
    throw Error("Session expired.");
  }
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Request failed.");
  return result;
}
export const number = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
export function Status({ value }: { value: string }) {
  const color = ["ready", "running", "active", "connected", "completed", "ended"].includes(value) ? "success" : ["provisioning", "starting", "restarting"].includes(value) ? "warning" : ["failed", "error", "cancelled", "offline"].includes(value) ? "error" : "default";
  const label = value === "draft" ? "Not deployed" : value === "ready" ? "Online" : value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
  return <Chip label={label} color={color} size="small" variant="outlined" />;
}
export function RecordStatus({
  id,
  resource,
  value,
  options,
  refresh,
}: {
  id: string;
  resource: string;
  value: string;
  options: string[];
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <label className="record-status">
      <span className="sr-only">Update status</span>
      <NativeSelect
        aria-label="Update status"
        value={value}
        disabled={busy}
        onChange={async (event) => {
          setBusy(true);
          setError("");
          try {
            await api(`${resource}/${id}`, "PATCH", {
              status: event.target.value,
            });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace("_", " ")}
          </option>
        ))}
      </NativeSelect>
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth={wide ? "md" : "sm"} aria-labelledby="dialog-title">
      <DialogTitle id="dialog-title" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {title}<IconButton aria-label="Close dialog" onClick={onClose} size="small"><X size={20} /></IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
    </Dialog>
  );
}
const pages = [
  {
    href: "connections",
    label: "Connections",
    icon: AudioLines,
    group: "Setup",
    description: "Manage WhatsApp connections.",
  },
  {
    href: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    group: "Daily work",
    description: "Review conversations and see what needs your attention.",
  },
  {
    href: "outbound",
    label: "Outbound calls",
    icon: PhoneOutgoing,
    group: "Daily work",
    description:
      "Upload contacts, tell your agent what to check, and follow each call.",
  },
  {
    href: "appointments",
    label: "Appointments",
    icon: CalendarDays,
    group: "Daily work",
    description: "See upcoming bookings and keep their status up to date.",
  },
  {
    href: "orders",
    label: "Orders",
    icon: PackageCheck,
    group: "Daily work",
    description:
      "Review customer orders and mark them complete when fulfilled.",
  },
  {
    href: "tickets",
    label: "Follow-ups",
    icon: Ticket,
    group: "Daily work",
    description: "Pick up customer requests that need your team’s help.",
  },
  {
    href: "agents",
    label: "Voice agents",
    icon: AudioLines,
    group: "Setup",
    description:
      "Choose what your agent says and what it can do for customers.",
  },
  {
    href: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    group: "Setup",
    description:
      "Give your agents the answers: FAQs, policies and business information.",
  },
  {
    href: "catalogue",
    label: "Products & services",
    icon: BoxIcon,
    group: "Setup",
    description:
      "Keep prices, descriptions and availability ready for customer calls.",
  },
  {
    href: "admin",
    label: "Customer access",
    icon: Users,
    group: "Administration",
    description: "Manage customer accounts and the features they can use.",
  },
];

export function Portal({
  initial,
  section,
  initialCustomers = [],
  workspace = "",
}: {
  initial: PortalData;
  section: string;
  initialCustomers?: Customer[];
  workspace?: string;
}) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [days, setDays] = useState(30);
  const [agent, setAgent] = useState("");
  const refreshId = useRef(0);
  const nav = pages.filter((page) => canAccessSection(data, page.href)).map(page => data.is_admin ? { ...page, group: "Administration" } : page);
  const page = pages.find((page) => page.href === section)!;
  const title = data.is_admin && section === "dashboard" && workspace ? `${initialCustomers.find(customer => customer.id === workspace)?.business_name || "Workspace"} calls` :
    section === "dashboard" && data.read_only ? "Call history" : page.label;
  const initials = (data.display_name || data.business_name)
    .charAt(0)
    .toUpperCase();
  const refresh = useCallback(
    async (nextDays = days, nextAgent = agent) => {
      const id = ++refreshId.current;
      setBusy(true);
      setError("");
      try {
        const result = await api(
          `data?section=${section}&days=${nextDays}${nextAgent ? `&agent=${nextAgent}` : ""}${data.is_admin && workspace && ["agents", "dashboard"].includes(section) ? `&workspace=${encodeURIComponent(workspace)}` : ""}`,
        );
        if (id === refreshId.current) setData(result);
      } catch (e) {
        if (id === refreshId.current) setError((e as Error).message);
      } finally {
        if (id === refreshId.current) setBusy(false);
      }
    },
    [days, agent, section, workspace, data.is_admin],
  );
  function notify(text: string) {
    setMessage(text);
    setError("");
  }
  const attention = [
    {
      href: "tickets",
      label: "Open follow-ups",
      count: data.attention.tickets,
    },
    {
      href: "orders",
      label: "Orders to fulfil",
      count: data.attention.orders,
    },
    {
      href: "appointments",
      label: "Upcoming bookings",
      count: data.attention.appointments,
    },
  ].filter((item) => canAccessSection(data, item.href));
  const navigation = <Box sx={{ width: 260, height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Link className="berry-brand" href="/dashboard"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</Link><IconButton aria-label="Close navigation" onClick={() => setMobile(false)} sx={{ display: { md: "none" } }}><X size={20} /></IconButton></Box>
    <Box className="berry-workspace"><Avatar sx={{ bgcolor: "secondary.light", color: "secondary.dark", width: 38, height: 38 }}>{data.business_name.charAt(0)}</Avatar><Box><strong>{data.is_admin ? "Administration" : data.business_name}</strong><small>{data.is_admin ? "Portal oversight" : data.read_only ? "View-only workspace" : "Your workspace"}</small></Box></Box>
    {["Daily work", "Setup", "Administration"].map(group => {
      const items = nav.filter(item => item.group === group);
      return items.length > 0 && <Box component="nav" aria-label={group} key={group} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: "text.primary", fontWeight: 600, px: 1.5, mb: 1 }}>{group}</Typography>
        <List disablePadding>{items.map(item => <ListItemButton key={item.href} component={Link} href={`/${item.href}`} selected={section === item.href} aria-current={section === item.href ? "page" : undefined} onClick={() => setMobile(false)} sx={{ borderRadius: 2, mb: .5, py: 1 }}>
          <ListItemIcon sx={{ minWidth: 38 }}><item.icon size={19} /></ListItemIcon><ListItemText primary={item.href === "dashboard" && data.read_only ? "Call history" : item.label} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }} />
        </ListItemButton>)}</List>
      </Box>;
    })}
    <Box className="berry-user"><Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", width: 36, height: 36 }}>{initials}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><strong>{data.display_name || "Workspace member"}</strong><small>{data.email}</small></Box><IconButton aria-label="Sign out" size="small" onClick={async () => { try { await api("logout", "POST"); window.location.href = "/login"; } catch (e) { setError((e as Error).message); } }}><LogOut size={18} /></IconButton></Box>
  </Box>;
  return (
    <Box className="berry-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppBar position="fixed" color="inherit" elevation={0} className="berry-appbar">
        <Toolbar className="berry-toolbar"><IconButton aria-label="Open navigation" onClick={() => setMobile(true)} sx={{ display: { md: "none" }, mr: 1 }}><Menu size={21} /></IconButton><Typography variant="body2" color="text.secondary">{data.is_admin ? "Administration" : data.business_name} / <strong>{title}</strong></Typography>
        {section !== "outbound" && <Button variant="outline" className="berry-refresh" disabled={busy} onClick={() => (section === "admin" || (data.is_admin && section === "dashboard" && !workspace)) ? window.location.reload() : refresh()}><RefreshCw size={15} className={busy ? "spin" : ""} />{busy ? "Refreshing…" : "Refresh"}</Button>}</Toolbar>
      </AppBar>
      <Drawer variant="permanent" open sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: 260, border: 0 } }}>{navigation}</Drawer>
      <Drawer variant="temporary" open={mobile} onClose={() => setMobile(false)} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: 260 } }}>{navigation}</Drawer>
      <Box component="main" id="main-content" className="berry-main">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {data.is_admin && section === "dashboard"
                  ? workspace ? "Review calls and transcripts for this workspace." : "Monitor customer workspaces, users, agents and WhatsApp numbers."
                  : data.read_only && section === "dashboard"
                  ? "Find a call and read what was discussed."
                  : page.description}
              </p>
            </div>
          </div>
          {message && (
            <div className="toast success" role="status">
              <Check size={18} />
              {message}
              <Button variant="ghost"
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </Button>
            </div>
          )}
          {error && (
            <div className="toast error" role="alert">
              {error}
              <Button variant="ghost" aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </Button>
            </div>
          )}
          {section === "dashboard" && data.is_admin && !workspace ? (
            <AdminOverview customers={initialCustomers} />
          ) : section === "dashboard" ? (
            <>
              {!data.read_only && attention.length > 0 && (
                <div className="attention-grid">
                  {attention.map((item) => (
                    <Link
                      className="attention-card"
                      key={item.href}
                      href={`/${item.href}`}
                    >
                      <span>{item.label}</span>
                      <strong>{number(item.count)}</strong>
                      <ArrowRight size={17} />
                    </Link>
                  ))}
                </div>
              )}
              <Card component="section" className="panel conversations-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Conversations</h2>
                    <p>
                      Choose a period, then open a call to read the transcript.
                    </p>
                  </div>
                  <div className="toolbar-actions">
                    <NativeSelect
                      aria-label="Filter by agent"
                      value={agent}
                      disabled={busy}
                      onChange={(e) => {
                        setAgent(e.target.value);
                        void refresh(days, e.target.value);
                      }}
                    >
                      <option value="">All agents</option>
                      {data.agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      aria-label="Date range"
                      value={days}
                      disabled={busy}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setDays(d);
                        void refresh(d, agent);
                      }}
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="conversation-summary" aria-busy={busy}>
                  <span>
                    <strong>{number(data.totals.calls)}</strong> calls
                  </span>
                  <span>
                    <strong>{number(data.totals.answered)}</strong> answered
                  </span>
                  <span>
                    <strong>{number(data.totals.inbound_minutes)}</strong>{" "}
                    inbound minutes
                  </span>
                  <span>
                    <strong>{number(data.totals.outbound_minutes)}</strong>{" "}
                    outbound minutes
                  </span>
                </div>
                <CallHistory key={`${days}-${agent}`} data={data} />
              </Card>
            </>
          ) : section === "connections" ? (
            <Connections agents={data.agents} />
          ) : section === "admin" ? (
            <Customers initial={initialCustomers} />
          ) : section === "agents" ? (
            <Agents data={data} refresh={refresh} notify={notify} customers={initialCustomers} workspace={workspace} />
          ) : section === "outbound" ? (
            <Outbound />
          ) : section === "appointments" ? (
            <Appointments data={data} refresh={refresh} />
          ) : section === "orders" ? (
            <Orders data={data} refresh={refresh} />
          ) : section === "tickets" ? (
            <Tickets data={data} refresh={refresh} />
          ) : (
            <Resources
              section={section}
              data={data}
              refresh={refresh}
              notify={notify}
            />
          )}
      </Box>
    </Box>
  );
}
