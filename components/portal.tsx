"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Cpu,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneIncoming,
  PackageCheck,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
  Ticket,
  Zap,
} from "lucide-react";
import type { PortalData, Call } from "@/lib/types";
import { Resources } from "./resources";
import { Agents } from "./agents";
import { Appointments } from "./appointments";
import { Orders } from "./orders";
import { Tickets } from "./tickets";

const Chart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => <div className="chart-loading" />,
});
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
      className={`status ${["ready", "running", "active", "completed", "ended"].includes(value) ? "green" : ["provisioning", "starting", "restarting"].includes(value) ? "amber" : "neutral"}`}
    >
      <i />
      {value === "draft"
        ? "Not deployed"
        : value === "ready"
          ? "Online"
          : value.charAt(0).toUpperCase() + value.slice(1)}
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
            await api(`${resource}/${id}`, "PATCH", { status: event.target.value });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
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
export function Portal({
  initial,
  section,
}: {
  initial: PortalData;
  section: string;
}) {
  const [data, setData] = useState(initial),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [days, setDays] = useState(30),
    [agent, setAgent] = useState(""),
    [help, setHelp] = useState(false);
  const nav = [
    { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "appointments", label: "Appointments", icon: CalendarDays },
    { href: "orders", label: "Orders", icon: PackageCheck },
    { href: "tickets", label: "Tickets", icon: Ticket },
    { href: "knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "catalogue", label: "Product Catalogue", icon: Box },
    { href: "agents", label: "Agent Management", icon: AudioLines },
  ];
  const refresh = useCallback(
    async (nextDays = days, nextAgent = agent) => {
      setBusy(true);
      try {
        setData(
          await api(
            `data?days=${nextDays}${nextAgent ? `&agent=${nextAgent}` : ""}`,
          ),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [days, agent],
  );
  function notify(text: string) {
    setMessage(text);
    setError("");
    setTimeout(() => setMessage(""), 6000);
  }
  const title = nav.find((n) => n.href === section)?.label || "Dashboard";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link className="brand" href="/dashboard">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          SerendibAI
          <sup>PORTAL</sup>
        </Link>
        <div className="workspace-switch">
          <div className="workspace-avatar">S</div>
          <div>
            <strong>SerendibAI workspace</strong>
            <span>Business account</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={`/${n.href}`}
              className={section === n.href ? "active" : ""}
              onClick={() => setMobile(false)}
            >
              <n.icon size={19} />
              {n.label}
              {section === n.href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <span className="tiny-orb">
              <Sparkles size={19} />
            </span>
            <strong>From website to voice.</strong>
            <p>
              Give your agent a head start with a prompt built for your
              business.
            </p>
            <Link href="/agents">
              Set up your agent <ArrowUpRight size={16} />
            </Link>
          </div>
          <button className="sidebar-help" onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> Workspace guide <ArrowUpRight size={14} />
          </button>
          <div className="user-block">
            <div className="user-avatar">A</div>
            <div>
              <strong>Workspace admin</strong>
              <span>{data.email}</span>
            </div>
            <button
              aria-label="Sign out"
              onClick={() =>
                api("logout", "POST").then(
                  () => (window.location.href = "/login"),
                )
              }
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
              <Menu size={20} />
            </button>
            <span className="muted">Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i /> Workspace connected
            </span>
            <span className="vertical-rule" />
            <button
              className={`icon-button ${busy ? "spin" : ""}`}
              aria-label="Refresh workspace"
              onClick={() => refresh()}
              disabled={busy}
            >
              <RefreshCw size={16} />
            </button>
            <div className="user-avatar small">A</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {section === "dashboard"
                  ? "YOUR BUSINESS, IN CONVERSATION"
                  : section === "appointments"
                    ? "EVERY BOOKING, IN ONE PLACE"
                    : section === "orders"
                      ? "CONFIRMED DURING A CALL"
                      : section === "tickets"
                        ? "ISSUES THAT NEED FOLLOW-UP"
                  : section === "agents"
                    ? "MEET YOUR DIGITAL TEAM"
                    : section === "knowledge"
                      ? "GIVE YOUR AGENTS THE ANSWERS"
                      : "EVERY DETAIL, AT THEIR FINGERTIPS"}
              </div>
              <h1>
                {section === "dashboard"
                  ? "Your conversations, at a glance."
                  : title}
              </h1>
              <p>
                {section === "dashboard"
                  ? "See how your voice agents are showing up for your business."
                  : section === "appointments"
                    ? "See appointments booked by your voice agents in Sri Lanka time."
                    : section === "orders"
                      ? "See confirmed customer orders as soon as your voice agent places them."
                      : section === "tickets"
                        ? "Keep every customer issue visible and ready for your team."
                  : section === "knowledge"
                    ? "A shared source of truth. Add your documents and keep every answer current."
                    : section === "catalogue"
                      ? "Your products and services, ready for the next conversation."
                      : "Create, configure and run voice agents. All from one place."}
              </p>
            </div>
            {section === "dashboard" && (
              <Link href="/agents" className="button primary">
                <Plus size={17} /> Create an agent
              </Link>
            )}
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
            <Dashboard
              data={data}
              days={days}
              agent={agent}
              setFilter={(d, a) => {
                setDays(d);
                setAgent(a);
                void refresh(d, a);
              }}
              notify={notify}
              refresh={refresh}
            />
          ) : section === "agents" ? (
            <Agents data={data} refresh={refresh} notify={notify} />
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
          <footer className="page-footer">
            <span>
              <AudioLines size={13} /> Thoughtful technology. Better
              conversations.
            </span>
            <span>SerendibAI © {new Date().getFullYear()}</span>
          </footer>
        </main>
      </div>
      {help && (
        <Modal title="Your workspace, connected" onClose={() => setHelp(false)}>
          <div className="modal-content prose">
            <p>
              <strong>1. Give your agent context.</strong> Upload readable
              documents to Knowledge Base and add products or services to the
              catalogue. Every agent in this workspace can search these when the
              corresponding tool is enabled.
            </p>
            <p>
              <strong>2. Make it yours.</strong> In Agent Management, create an
              agent and write its instructions, or use the website assistant to
              research and draft them. Review generated facts before saving.
            </p>
            <p>
              <strong>3. Choose your compute.</strong> Browse live Vast.ai
              offers within your hourly budget. Provision, start, stop or
              destroy the instance. Stopped instances still incur storage
              charges; destroying releases the rental.
            </p>
            <p>
              <strong>4. Connect your phone.</strong> Add your WhatsApp Business
              phone ID and access credentials under Connections. Configure the
              displayed webhook in Meta. The existing phone connection is
              available on the migrated agent.
            </p>
            <p>
              <strong>5. Follow real performance.</strong> The dashboard uses
              persisted calls. Historical calls without tokens or duration
              remain unmeasured. New runtime calls report these automatically.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Dashboard({
  data,
  days,
  agent,
  setFilter,
  notify,
  refresh,
}: {
  data: PortalData;
  days: number;
  agent: string;
  setFilter: (d: number, a: string) => void;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const [metric, setMetric] = useState<"calls" | "minutes" | "tokens">("calls"),
    [call, setCall] = useState<Call | null>(null),
    [limits, setLimits] = useState(false),
    [saving, setSaving] = useState(false),
    [limitError, setLimitError] = useState("");
  const online = data.agents.filter(
    (a) =>
      a.heartbeat_at &&
      data.generatedAt - new Date(a.heartbeat_at).getTime() < 90000 &&
      a.status === "ready",
  ).length;
  const metrics = [
    {
      key: "tokens" as const,
      label: "Tokens used",
      value: data.totals.tokens,
      quota: data.quotas.tokens,
      icon: Zap,
      note: data.totals.measured_tokens
        ? `${data.totals.measured_tokens} measured calls`
        : "Historical tokens not recorded",
    },
    {
      key: "minutes" as const,
      label: "Conversation minutes",
      value: data.totals.minutes,
      quota: data.quotas.minutes,
      icon: Clock3,
      note: data.totals.measured_minutes
        ? `${data.totals.measured_minutes} measured calls`
        : "Historical duration not recorded",
    },
    {
      key: "calls" as const,
      label: "Calls answered",
      value: data.totals.answered,
      quota: data.quotas.calls,
      icon: PhoneIncoming,
      note: `${number(data.totals.calls)} total calls received`,
    },
  ];
  function exportCalls() {
    const lines = [
      ["Date", "Agent", "Status", "Duration seconds", "Tokens"],
      ...data.calls.map((c) => [
        c.created_at,
        c.agent_name,
        c.status,
        c.duration_seconds,
        c.tokens,
      ]),
    ];
    const text = lines
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "serendibai-calls.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <section className="welcome-banner">
        <div>
          <span className="banner-label">
            <span className="pulse-dot" /> YOUR WORKSPACE AT A GLANCE
          </span>
          <h2>Great conversations start here.</h2>
          <p>
            {number(data.agents.length)} agent
            {data.agents.length === 1 ? "" : "s"} in your team.{" "}
            {online
              ? `${online} online and ready to help.`
              : "Ready whenever your business is."}
          </p>
          <Link href="/agents">
            Meet your agents <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="sound-wave">
            {Array.from({ length: 35 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${16 + Math.sin(i * 0.8) ** 2 * 70 + Math.sin(i * 0.23) ** 2 * 45}px`,
                  opacity: 0.25 + Math.sin(i * 0.15) ** 2 * 0.6,
                }}
              />
            ))}
          </div>
          <div className="banner-glow" />
          <span className="wave-pill">
            <AudioLines size={14} /> A voice for your business
          </span>
        </div>
      </section>
      <div className="section-toolbar">
        <div>
          <h2>Performance overview</h2>
          <span className="tag">Real call data</span>
        </div>
        <div>
          <select
            aria-label="Filter by agent"
            value={agent}
            onChange={(e) => setFilter(days, e.target.value)}
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
            onChange={(e) => setFilter(Number(e.target.value), agent)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>
      <div className="metric-grid">
        {metrics.map((m) => (
          <button
            className={`metric-card ${metric === m.key ? "selected" : ""}`}
            key={m.key}
            onClick={() => setMetric(m.key)}
          >
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon ${m.key}`}>
                <m.icon size={17} />
              </span>
            </div>
            <div className="metric-value">
              {number(m.value)}
              <span>/ {number(m.quota)}</span>
            </div>
            <div className="quota-track">
              <div
                style={{
                  width: `${Math.min(100, ((m.value || 0) / m.quota) * 100)}%`,
                }}
              />
            </div>
            <div className="metric-bottom">
              <span>{m.note}</span>
              <strong>
                {m.value == null
                  ? "Unmeasured"
                  : `${((m.value / m.quota) * 100).toFixed(1)}% used`}
              </strong>
            </div>
          </button>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Conversation activity</h2>
              <p>Every interaction tells a story.</p>
            </div>
            <div className="segmented">
              {(["calls", "minutes", "tokens"] as const).map((m) => (
                <button
                  key={m}
                  className={m === metric ? "active" : ""}
                  onClick={() => setMetric(m)}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>
              {number(
                metric === "calls" ? data.totals.calls : data.totals[metric],
              )}
            </strong>
            <span>
              {metric === "calls"
                ? "calls received"
                : metric === "minutes"
                  ? "measured minutes"
                  : "measured tokens"}
              <small>over the last {days} days</small>
            </span>
            <span className="chart-legend">
              <i />
              {metric[0].toUpperCase() + metric.slice(1)}
            </span>
          </div>
          <div className="main-chart">
            <Chart data={data.daily} metric={metric} />
            {metric !== "calls" && data.totals[metric] === null && (
              <div className="chart-empty">
                <Activity size={24} />
                <strong>Measurement starts with your next call.</strong>
                <span>
                  Older call records don’t include {metric}.<br />
                  Your new runtime will report them automatically.
                </span>
              </div>
            )}
          </div>
          <div className="chart-footnote">
            {metric === "calls"
              ? "Daily received calls · Live records from Neon"
              : "Only measured calls are included · Missing data is never estimated"}
          </div>
        </section>
        <section className="panel capacity-panel">
          <div className="panel-heading">
            <div>
              <h2>Your workspace</h2>
              <p>Connected and under your control.</p>
            </div>
            <span className="icon-tile">
              <Cpu size={18} />
            </span>
          </div>
          <div className="capacity-ring">
            <svg viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r="72"
                fill="none"
                stroke="#f0edf5"
                strokeWidth="13"
              />
              <circle
                cx="90"
                cy="90"
                r="72"
                fill="none"
                stroke="#9373de"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(3, (online / Math.max(1, data.agents.length)) * 452)} 452`}
                transform="rotate(-90 90 90)"
              />
            </svg>
            <div>
              <strong>
                {online}
                <span> / {data.agents.length}</span>
              </strong>
              <small>AGENTS ONLINE</small>
            </div>
          </div>
          <div className="capacity-row">
            <span>
              <i className="dot purple" /> Knowledge sources
            </span>
            <strong>{data.documents.length}</strong>
          </div>
          <div className="capacity-row">
            <span>
              <i className="dot peach" /> Catalogue items
            </span>
            <strong>{data.products.length}</strong>
          </div>
          <div className="capacity-row">
            <span>
              <i className="dot grey" /> Compute instances
            </span>
            <strong>{data.agents.filter((a) => a.instance_id).length}</strong>
          </div>
          <button
            className="button subtle full"
            onClick={() => setLimits(true)}
          >
            <Settings2 size={15} /> Configure workspace limits
          </button>
        </section>
      </div>
      <section className="panel calls-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Recent conversations{" "}
              <span className="count">{data.calls.length}</span>
            </h2>
            <p>A closer look at the people your agents have helped.</p>
          </div>
          <button className="button" onClick={exportCalls}>
            <ArrowDownToLine size={15} /> Export CSV
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>CALLER</th>
                <th>AGENT</th>
                <th>STATUS</th>
                <th>DURATION</th>
                <th>WHEN</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.calls.slice(0, 8).map((c) => (
                <tr key={c.id} onClick={() => setCall(c)} className="clickable">
                  <td>
                    <span className="caller">
                      <span className="caller-icon">
                        <PhoneIncoming size={15} />
                      </span>
                      {c.customer_phone
                        ? `••• ${c.customer_phone.slice(-4)}`
                        : "Unknown caller"}
                    </span>
                  </td>
                  <td>{c.agent_name || "Previous agent"}</td>
                  <td>
                    <Status value={c.status} />
                  </td>
                  <td>
                    {c.duration_seconds == null ? (
                      <span className="muted">Not recorded</span>
                    ) : (
                      `${number(c.duration_seconds / 60)} min`
                    )}
                  </td>
                  <td className="muted">
                    {new Date(c.created_at).toLocaleDateString("en-GB", {
                      timeZone: "Asia/Colombo",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <button
                      aria-label="View conversation"
                      className="icon-button"
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.calls.length && (
            <div className="empty">
              <PhoneIncoming size={25} />
              <h3>No calls in this period</h3>
              <p>Choose a longer date range or connect an agent to begin.</p>
            </div>
          )}
        </div>
        <div className="table-footer">
          Showing {Math.min(8, data.calls.length)} of{" "}
          {number(data.totals.calls)} calls in this period{" "}
          <span>Historical records are preserved.</span>
        </div>
      </section>
      {call && (
        <Modal title="Conversation details" onClose={() => setCall(null)} wide>
          <div className="modal-content">
            <div className="call-meta">
              <Status value={call.status} />
              <span>{call.agent_name}</span>
              <span>
                {new Date(call.created_at).toLocaleString("en-GB", {
                  timeZone: "Asia/Colombo",
                })}
              </span>
            </div>
            <p className="muted mono">{call.id}</p>
            <div className="transcript">
              {call.transcript || "No transcript was recorded for this call."}
            </div>
            <p className="muted">
              Source: {call.source} · Tokens: {number(call.tokens)} · Duration:{" "}
              {call.duration_seconds == null
                ? "not recorded"
                : `${number(call.duration_seconds)} seconds`}
            </p>
          </div>
        </Modal>
      )}
      {limits && (
        <Modal title="Workspace limits" onClose={() => setLimits(false)}>
          <form
            className="modal-content form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const f = new FormData(e.currentTarget);
                await api("quotas", "PUT", Object.fromEntries(f));
                await refresh();
                setLimits(false);
                notify("Workspace limits updated.");
              } catch (e) {
                setLimitError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <p className="muted">
              Monthly reference allowances for your workspace. These are
              admin-configured planning limits, not a purchased subscription.
            </p>
            {(["tokens", "minutes", "calls"] as const).map((k) => (
              <label key={k}>
                {k[0].toUpperCase() + k.slice(1)}
                <input
                  name={k}
                  type="number"
                  min="1"
                  defaultValue={data.quotas[k]}
                  required
                />
              </label>
            ))}
            {limitError && <p className="error">{limitError}</p>}
            <button className="button primary" disabled={saving}>
              {saving ? "Saving…" : "Save limits"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
