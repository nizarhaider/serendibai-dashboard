"use client";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useCallback, useState, useRef } from "react";
import { Card, Chip, Dialog, DialogContent, DialogTitle, IconButton, Skeleton } from "@mui/material";
import { mutate as updateCache, useSWRConfig } from "swr";
import {
  AudioLines,
  BookOpen,
  Box as BoxIcon,
  CalendarDays,
  Check,
  LayoutDashboard,
  PhoneOutgoing,
  PackageCheck,
  RefreshCw,
  Users,
  X,
  Ticket,
} from "lucide-react";
import type { PortalData, Customer } from "@/lib/types";
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

const cacheAge = 60_000;
const cacheKey = (scope: string, path: string) => `serendibai:${scope}:${path}`;
const memoryCache = new Map<string, { time: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export function cachedApi<T>(path: string, scope: string): T | undefined {
  const key = cacheKey(scope, path);
  const memory = memoryCache.get(key);
  if (memory && Date.now() - memory.time < cacheAge) return memory.data as T;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (value && Date.now() - value.time < cacheAge) memoryCache.set(key, value);
    return value && Date.now() - value.time < cacheAge ? value.data as T : undefined;
  } catch { return undefined; }
}
export function apiWithCache<T>(path: string, scope: string) {
  const cached = cachedApi<T>(path, scope);
  if (cached !== undefined) return Promise.resolve(cached);
  const key = cacheKey(scope, path);
  const existing = pending.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const request = api(path, "GET", undefined, scope) as Promise<T>;
  pending.set(key, request);
  void request.then(() => pending.delete(key), () => pending.delete(key));
  return request;
}

export async function api(path: string, method = "GET", body?: unknown, cacheScope?: string) {
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
  if (method === "GET" && cacheScope && typeof window !== "undefined") {
    const value = { time: Date.now(), data: result };
    memoryCache.set(cacheKey(cacheScope, path), value);
    try { sessionStorage.setItem(cacheKey(cacheScope, path), JSON.stringify(value)); } catch {}
  }
  if (method !== "GET" && typeof window !== "undefined") {
    const current = window.location.pathname.slice(1);
    void updateCache(key => typeof key === "string" && key.startsWith("data?") && !key.startsWith(`data?section=${current}&`) && key !== `data?section=${current}`, undefined, { revalidate: false });
    if (path.startsWith("customers")) void updateCache("customers");
    memoryCache.clear();
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("serendibai:")) sessionStorage.removeItem(key);
  }
  return result;
}

export function WorkspaceSkeleton({ section }: { section: string }) {
  return <div className="workspace-skeleton" aria-label={`Loading ${section}`} role="status">
    <div className="skeleton-heading"><div><Skeleton variant="text" width={190} height={38} /><Skeleton variant="text" width={290} /></div><Skeleton variant="rounded" width={90} height={38} /></div>
    {section === "dashboard" ? <><div className="skeleton-stats">{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={102} />)}</div><Skeleton variant="rounded" height={340} /></> : <><Skeleton variant="rounded" height={74} /><Skeleton variant="rounded" height={300} /></>}
  </div>;
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
export const pages = [
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
  const { mutate } = useSWRConfig();
  const [filteredData, setFilteredData] = useState<PortalData | null>(null);
  const data = filteredData || initial;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(30);
  const [agent, setAgent] = useState("");
  const refreshId = useRef(0);
  const page = pages.find((page) => page.href === section)!;
  const title = data.is_admin && section === "dashboard" && workspace ? `${initialCustomers.find(customer => customer.id === workspace)?.business_name || "Workspace"} calls` :
    section === "dashboard" && data.read_only ? "Call history" : page.label;
  const refresh = useCallback(
    async (nextDays = days, nextAgent = agent) => {
      const id = ++refreshId.current;
      setBusy(true);
      setError("");
      try {
        const result = await api(
          `data?section=${section}&days=${nextDays}${nextAgent ? `&agent=${nextAgent}` : ""}${data.is_admin && workspace && ["agents", "dashboard"].includes(section) ? `&workspace=${encodeURIComponent(workspace)}` : ""}`,
          "GET", undefined, data.email,
        );
        if (id === refreshId.current) {
          if (nextDays === 30 && !nextAgent) {
            setFilteredData(null);
            void mutate(`data?section=${section}${data.is_admin && workspace && ["agents", "dashboard"].includes(section) ? `&workspace=${encodeURIComponent(workspace)}` : ""}`, result, false);
          } else setFilteredData(result);
        }
      } catch (e) {
        if (id === refreshId.current) setError((e as Error).message);
      } finally {
        if (id === refreshId.current) setBusy(false);
      }
    },
    [days, agent, section, workspace, data.is_admin, data.email, mutate],
  );
  async function refreshPage() {
    if (section === "admin" || (data.is_admin && section === "dashboard" && !workspace)) {
      setBusy(true);
      try { await mutate("customers"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    } else {
      if (section === "connections") void mutate("connections").catch((e) => setError((e as Error).message));
      await refresh();
    }
  }
  function notify(text: string) {
    setMessage(text);
    setError("");
  }
  return (
    <>
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
            {section !== "outbound" && <Button variant="outline" className="berry-refresh" disabled={busy} onClick={() => void refreshPage()}><RefreshCw size={15} className={busy ? "spin" : ""} />{busy ? "Refreshing…" : "Refresh"}</Button>}
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
              <div className="call-stats-grid">
                {[{ label: "Calls placed", count: data.totals.calls }, { label: "Completed", count: data.totals.answered }, { label: "Failed", count: data.totals.failed }].map(({ label, count }) => <Card className="panel call-stat" key={label}><span>{label}</span><strong>{number(count)}</strong></Card>)}
              </div>
              <Card component="section" className="panel conversations-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Conversations</h2>
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
            <Connections agents={data.agents} cacheScope={data.email} />
          ) : section === "admin" ? (
            <Customers key={JSON.stringify(initialCustomers)} initial={initialCustomers} />
          ) : section === "agents" ? (
            <Agents data={data} refresh={refresh} notify={notify} customers={initialCustomers} workspace={workspace} />
          ) : section === "outbound" ? (
            <Outbound cacheScope={data.email} />
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
    </>
  );
}
