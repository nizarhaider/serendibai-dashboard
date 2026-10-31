"use client";
import Link from "next/link";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Box,
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
  return (
    <span
      className={`status ${["ready", "running", "active", "completed", "ended"].includes(value) ? "green" : ["provisioning", "starting", "restarting"].includes(value) ? "amber" : ["failed", "error", "cancelled", "offline"].includes(value) ? "red" : "neutral"}`}
    >
      <i />
      {value === "draft"
        ? "Not deployed"
        : value === "ready"
          ? "Online"
          : value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ")}
    </span>
  );
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
      <select
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
      </select>
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
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal-backdrop"
      onClick={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
const pages = [
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
    icon: Box,
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
}: {
  initial: PortalData;
  section: string;
  initialCustomers?: Customer[];
}) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [days, setDays] = useState(30);
  const [agent, setAgent] = useState("");
  const refreshId = useRef(0);
  const nav = pages.filter((page) => canAccessSection(data, page.href));
  const page = pages.find((page) => page.href === section)!;
  const title =
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
          `data?section=${section}&days=${nextDays}${nextAgent ? `&agent=${nextAgent}` : ""}`,
        );
        if (id === refreshId.current) setData(result);
      } catch (e) {
        if (id === refreshId.current) setError((e as Error).message);
      } finally {
        if (id === refreshId.current) setBusy(false);
      }
    },
    [days, agent, section],
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
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "mobile-open" : ""}`}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") setMobile(false);
        }}
      >
        <Link className="brand" href="/dashboard">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          SerendibAI
        </Link>
        <div className="workspace-switch">
          <div className="workspace-avatar">{data.business_name.charAt(0)}</div>
          <div>
            <strong>{data.business_name}</strong>
            <span>
              {data.read_only ? "View-only workspace" : "Your workspace"}
            </span>
          </div>
        </div>
        {["Daily work", "Setup", "Administration"].map((group) => {
          const items = nav.filter((item) => item.group === group);
          return (
            items.length > 0 && (
              <nav key={group} aria-label={group}>
                <div className="nav-label">{group}</div>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={`/${item.href}`}
                    aria-current={section === item.href ? "page" : undefined}
                    className={section === item.href ? "active" : ""}
                    onClick={() => setMobile(false)}
                  >
                    <item.icon size={18} />
                    {item.href === "dashboard" && data.read_only
                      ? "Call history"
                      : item.label}
                  </Link>
                ))}
              </nav>
            )
          );
        })}
        <div className="sidebar-bottom">
          <div className="user-block">
            <div className="user-avatar">{initials}</div>
            <div>
              <strong>{data.display_name || "Workspace member"}</strong>
              <span>{data.email}</span>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await api("logout", "POST");
                  window.location.href = "/login";
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="muted">{data.business_name}</span>
            <span className="crumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          {section !== "outbound" && (
            <button
              className="button refresh-button"
              disabled={busy}
              onClick={() =>
                section === "admin" ? window.location.reload() : refresh()
              }
            >
              <RefreshCw size={15} className={busy ? "spin" : ""} />
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {data.read_only && section === "dashboard"
                  ? "Find a call and read what was discussed."
                  : page.description}
              </p>
            </div>
          </div>
          {message && (
            <div className="toast success" role="status">
              <Check size={18} />
              {message}
              <button
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="toast error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {section === "dashboard" ? (
            <>
              {!data.read_only && !data.agents.length && (
                <section className="setup-start panel">
                  <AudioLines size={26} />
                  <div>
                    <h2>Set up your first voice agent</h2>
                    <p>Add its name and instructions to get started.</p>
                  </div>
                  <Link className="button primary" href="/agents">
                    Set up agent <ArrowRight size={16} />
                  </Link>
                </section>
              )}
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
              <section className="panel conversations-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Conversations</h2>
                    <p>
                      Choose a period, then open a call to read the transcript.
                    </p>
                  </div>
                  <div className="toolbar-actions">
                    <select
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
                    </select>
                    <select
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
                    </select>
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
              </section>
            </>
          ) : section === "admin" ? (
            <Customers initial={initialCustomers} />
          ) : section === "agents" ? (
            <Agents data={data} refresh={refresh} notify={notify} />
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
        </main>
      </div>
    </div>
  );
}
