"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  Globe,
  Loader2,
  MessageSquare,
  PackageCheck,
  Plus,
  Save,
  Settings2,
  Ticket,
  Shield,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import type { Agent, PortalData } from "@/lib/types";
import { api, Modal, number, Status } from "./portal";

const defaultAgent = () => ({
  name: "",
  company_url: "",
  system_prompt: "",
  greeting: "Hello! How can I help you today?",
  voice: "Aoede",
  languages: ["English", "Sinhala", "Tamil"],
  tools: ["search_knowledge", "search_products", "book_appointment", "create_order", "create_ticket"],
  max_calls: 3,
  phone_number_id: "",
});
type Editable = ReturnType<typeof defaultAgent> & { id?: string };
export function Agents({
  data,
  refresh,
  notify,
}: {
  data: PortalData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState(data.agents[0]?.id || ""),
    [edit, setEdit] = useState<Editable>(data.agents[0] || defaultAgent()),
    [tab, setTab] = useState("instructions"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [newOpen, setNewOpen] = useState(false),
    [newName, setNewName] = useState(""),
    [research, setResearch] = useState(""),
    [draft, setDraft] = useState<{
      text: string;
      sources: { url: string; title: string }[];
    } | null>(null),
    [confirm, setConfirm] = useState<{ action: string } | null>(null),
    [secrets, setSecrets] = useState<Record<string, string>>({});
  const current = data.agents.find((a) => a.id === selected);
  function choose(a: Agent) {
    setSelected(a.id);
    setEdit(a);
    setDraft(null);
    setError("");
    setSecrets({});
  }
  async function save() {
    setBusy("save");
    setError("");
    try {
      await api(`agents/${selected}`, "PUT", { ...edit, credentials: secrets });
      setSecrets({});
      await refresh();
      notify(
        "Agent configuration saved. New calls use the latest version; restart is optional.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const heartbeatFresh = Boolean(
    current?.heartbeat_at &&
    data.generatedAt - new Date(current.heartbeat_at).getTime() < 90000,
  );
  const runtimeStatus =
    current?.status === "ready" && !heartbeatFresh
      ? "offline"
      : current?.status || "draft";
  return (
    <>
      <div className="agents-toolbar">
        <div className="agent-count">
          <span className="icon-tile lavender">
            <AudioLines size={20} />
          </span>
          <strong>
            {data.agents.length} voice agent
            {data.agents.length !== 1 ? "s" : ""}
          </strong>
          <span className="muted">A team that sounds like you.</span>
        </div>
        <button className="button primary" onClick={() => setNewOpen(true)}>
          <Plus size={17} /> New voice agent
        </button>
      </div>
      {error && (
        <div className="toast error" role="alert">
          {error}
        </div>
      )}
      <div className="agent-workspace">
        <aside className="agent-list">
          {data.agents.map((a) => (
            <button
              key={a.id}
              className={`agent-list-card ${a.id === selected ? "selected" : ""}`}
              onClick={() => choose(a)}
            >
              <div className="agent-list-top">
                <span className="agent-avatar">
                  <AudioLines size={23} />
                </span>
                <ChevronRight size={16} />
              </div>
              <strong>{a.name}</strong>
              <span className="agent-domain">
                {a.company_url
                  ? new URL(a.company_url).hostname
                  : "Business voice agent"}
              </span>
              <Status
                value={
                  a.status === "ready" &&
                  (!a.heartbeat_at ||
                    data.generatedAt - new Date(a.heartbeat_at).getTime() >
                      90000)
                    ? "offline"
                    : a.status
                }
              />
            </button>
          ))}
          <div className="agent-tip">
            <Shield size={18} />
            <strong>You’re in control.</strong>
            <p>
              Run the voice server locally and see its live status here.
            </p>
          </div>
        </aside>
        {current ? (
          <section className="panel agent-editor">
            <div className="agent-editor-heading">
              <div>
                <div className="eyebrow">VOICE AGENT</div>
                <h2>{current.name}</h2>
                <span className="mono">
                  {current.id.slice(0, 8)} · v{current.version}
                </span>
              </div>
              <div>
                <Status value={runtimeStatus} />
                <button
                  className="button primary"
                  disabled={Boolean(busy)}
                  onClick={save}
                >
                  {busy === "save" ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  Save changes
                </button>
              </div>
            </div>
            <div className="editor-tabs">
              {[
                {
                  key: "instructions",
                  label: "Instructions",
                  icon: MessageSquare,
                },
                { key: "tools", label: "Tools & behaviour", icon: Settings2 },
                { key: "runtime", label: "Runtime", icon: AudioLines },
                { key: "connections", label: "Connections", icon: Code2 },
              ].map((t) => (
                <button
                  key={t.key}
                  className={tab === t.key ? "active" : ""}
                  onClick={() => setTab(t.key)}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="editor-content">
              {tab === "instructions" ? (
                <>
                  <div className="field-row">
                    <label>
                      Agent name
                      <input
                        value={edit.name}
                        onChange={(e) =>
                          setEdit({ ...edit, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Business website
                      <div className="input-with-icon">
                        <Globe size={16} />
                        <input
                          placeholder="https://yourbusiness.com"
                          value={edit.company_url}
                          onChange={(e) =>
                            setEdit({ ...edit, company_url: e.target.value })
                          }
                        />
                      </div>
                    </label>
                  </div>
                  <div className="prompt-label">
                    <label htmlFor="system-prompt">System prompt</label>
                    <span>{number(edit.system_prompt.length)} characters</span>
                  </div>
                  <div className="prompt-editor">
                    <div className="prompt-editor-top">
                      <span>
                        <span className="dot purple" /> agent.instructions
                      </span>
                      <span>Plain text</span>
                    </div>
                    <textarea
                      id="system-prompt"
                      value={edit.system_prompt}
                      placeholder="You are the voice assistant for…\n\nDescribe your business, the way your agent should speak, and what it can help callers with."
                      onChange={(e) =>
                        setEdit({ ...edit, system_prompt: e.target.value })
                      }
                    />
                    <div className="prompt-assistant">
                      <div className="assistant-label">
                        <Sparkles size={16} />
                        <strong>A little help from AI</strong>
                        <span>
                          Research a website. Draft a great starting point.
                        </span>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy("research");
                          setError("");
                          try {
                            setDraft(
                              await api("assistant", "POST", {
                                prompt: research,
                              }),
                            );
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        <input
                          aria-label="AI setup request"
                          placeholder="Create a voice agent for airasia.com…"
                          value={research}
                          onChange={(e) => setResearch(e.target.value)}
                          required
                          minLength={5}
                        />
                        <button
                          className="button primary"
                          disabled={Boolean(busy)}
                        >
                          {busy === "research" ? (
                            <Loader2 className="spin" size={16} />
                          ) : (
                            <WandSparkles size={16} />
                          )}{" "}
                          {busy === "research"
                            ? "Researching…"
                            : "Generate prompt"}
                        </button>
                      </form>
                      <small>
                        Uses live website research. Review the draft before
                        applying it.
                      </small>
                    </div>
                  </div>
                  <div className="field-row greeting-row">
                    <label>
                      Opening greeting
                      <textarea
                        rows={3}
                        value={edit.greeting}
                        onChange={(e) =>
                          setEdit({ ...edit, greeting: e.target.value })
                        }
                      />
                      <small>The first words your customer hears.</small>
                    </label>
                    <div className="prompt-hint">
                      <AudioLines size={24} />
                      <h3>Let your brand do the talking.</h3>
                      <p>
                        Short instructions, clear boundaries and a warm greeting
                        make for better conversations.
                      </p>
                    </div>
                  </div>
                </>
              ) : tab === "tools" ? (
                <>
                  <h3>Knowledge & capabilities</h3>
                  <p className="muted">
                    Choose what this agent can access. Disabled tools are also
                    blocked on the server.
                  </p>
                  <div className="tool-options">
                    {[
                      {
                        name: "search_knowledge",
                        title: "Search knowledge base",
                        text: `Find answers across ${data.documents.length} uploaded documents.`,
                        icon: BookOpen,
                      },
                      {
                        name: "search_products",
                        title: "Search product catalogue",
                        text: `Look up ${data.products.length} products and services, prices and availability.`,
                        icon: Box,
                      },
                      {
                        name: "book_appointment",
                        title: "Book appointments",
                        text: "Add confirmed caller appointments to the workspace calendar.",
                        icon: CalendarDays,
                      },
                      {
                        name: "create_order",
                        title: "Create orders",
                        text: "Save confirmed caller orders in the workspace.",
                        icon: PackageCheck,
                      },
                      {
                        name: "create_ticket",
                        title: "Create support tickets",
                        text: "Log caller issues for your team to follow up.",
                        icon: Ticket,
                      },
                      {
                        name: "send_whatsapp_message",
                        title: "Send a WhatsApp message",
                        text: "Send follow-up text to the caller only when they request it.",
                        icon: MessageSquare,
                      },
                    ].map((t) => (
                      <label className="tool-option" key={t.name}>
                        <span className="icon-tile">
                          <t.icon size={21} />
                        </span>
                        <span>
                          <strong>{t.title}</strong>
                          <small>{t.text}</small>
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={edit.tools.includes(t.name)}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              tools: e.target.checked
                                ? [...edit.tools, t.name]
                                : edit.tools.filter((v) => v !== t.name),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="field-row">
                    <label>
                      Voice
                      <select
                        value={edit.voice}
                        onChange={(e) =>
                          setEdit({ ...edit, voice: e.target.value })
                        }
                      >
                        {[
                          { value: "Aoede", label: "Female" },
                          { value: "Charon", label: "Male" },
                        ].map((voice) => (
                          <option key={voice.value} value={voice.value}>
                            {voice.label}
                          </option>
                        ))}
                      </select>
                      <small>Gemini native audio voice.</small>
                    </label>
                    <label>
                      Concurrent call limit
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={edit.max_calls}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            max_calls: Number(e.target.value),
                          })
                        }
                      />
                      <small>
                        Admission limit, not a guaranteed throughput benchmark.
                      </small>
                    </label>
                  </div>
                  <label>Supported languages</label>
                  <div className="language-options">
                    {["English", "Sinhala", "Tamil"].map((l) => (
                      <label key={l}>
                        <input
                          type="checkbox"
                          checked={edit.languages.includes(l)}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              languages: e.target.checked
                                ? [...edit.languages, l]
                                : edit.languages.filter((v) => v !== l),
                            })
                          }
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </>
              ) : tab === "runtime" ? (
                <div className="runtime-details">
                  <h3>Voice server</h3>
                  <div><span>Status</span><Status value={heartbeatFresh ? current.status : "offline"} /></div>
                  <div><span>Active calls</span><code>{heartbeatFresh ? number(Number(current.telemetry.active_calls || 0)) : "—"} / {current.max_calls}</code></div>
                  <div><span>Last heartbeat</span><code>{current.heartbeat_at ? new Date(current.heartbeat_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo" }) : "Never"}</code></div>
                  <div><span>Configuration</span><code>saved v{current.version} / running {current.deployed_version > 0 ? `v${current.deployed_version}` : "—"}</code></div>
                  <div><span>Health</span><code>{current.telemetry.error ? String(current.telemetry.error) : heartbeatFresh ? "Runtime responding" : "Start the local voice server"}</code></div>
                  <div><span>Local command</span><code>./deploy.sh --env local</code></div>
                </div>
              ) : (
                <>
                  <h3>WhatsApp Business connection</h3>
                  <p className="muted">
                    Connect this agent to your business number. Credentials are
                    encrypted and never sent back to the browser.
                  </p>
                  <label>
                    Phone number ID
                    <input
                      value={edit.phone_number_id}
                      placeholder="Meta phone number ID"
                      onChange={(e) =>
                        setEdit({ ...edit, phone_number_id: e.target.value })
                      }
                    />
                  </label>
                  <div className="field-row secret-fields">
                    {[
                      {
                        key: "WHATSAPP_ACCESS_TOKEN",
                        label: "WhatsApp access token",
                      },
                      { key: "WHATSAPP_APP_SECRET", label: "Meta app secret" },
                      {
                        key: "VERIFY_TOKEN",
                        label: "Webhook verification token",
                      },
                      {
                        key: "GEMINI_API_KEY",
                        label: "Gemini API key (optional override)",
                      },
                    ].map((s) => (
                      <label key={s.key}>
                        {s.label}
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder={
                            current.has_credentials
                              ? "Saved securely · leave blank to keep"
                              : "Enter credential"
                          }
                          value={secrets[s.key] || ""}
                          onChange={(e) =>
                            setSecrets({ ...secrets, [s.key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="runtime-details">
                    <h3>Developer details</h3>
                    <div>
                      <span>Agent ID</span>
                      <code>{current.id}</code>
                    </div>
                    <div>
                      <span>Webhook URL</span>
                      <code>{`https://portal.serendibai.lk/api/voice/${current.id}/webhook`}</code>
                    </div>
                    <div>
                      <span>Knowledge scope</span>
                      <code>This workspace only</code>
                    </div>
                  </div>
                  <p className="notice">
                    Add the webhook URL to your Meta app, use your saved
                    verification token, and subscribe to call events. A Meta app
                    secret is required for the portal webhook. The migrated
                    agent also retains its existing whatsapp.serendibai.lk
                    connection.
                  </p>
                  <button
                    className="button danger-outline"
                    disabled={Boolean(busy)}
                    onClick={() => setConfirm({ action: "delete" })}
                  >
                    <Trash2 size={15} /> Delete agent configuration
                  </button>
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="panel empty agent-empty">
            <AudioLines size={40} />
            <h2>Your first voice agent starts here.</h2>
            <p>
              Create an agent, give it a personality and connect it to your
              business.
            </p>
            <button className="button primary" onClick={() => setNewOpen(true)}>
              <Plus size={17} /> Create voice agent
            </button>
          </section>
        )}
      </div>
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <h2>Workspace activity</h2>
            <p>A clear record of your latest changes.</p>
          </div>
          <span className="tag">Audit log</span>
        </div>
        {data.events.length ? (
          <div className="event-list">
            {data.events.slice(0, 6).map((e) => (
              <div key={e.id}>
                <span className="event-dot" />
                <div>
                  <strong>{e.action}</strong>
                  <p>{e.detail}</p>
                </div>
                <time>
                  {new Date(e.created_at).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty small-empty">
            <Check size={21} />
            <p>Changes to your agents and knowledge will appear here.</p>
          </div>
        )}
      </section>
      {newOpen && (
        <Modal title="Create a voice agent" onClose={() => setNewOpen(false)}>
          <form
            className="modal-content form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy("new");
              setError("");
              try {
                const values = { ...defaultAgent(), name: newName };
                const result = await api("agents", "POST", values);
                await refresh();
                setSelected(result.id);
                setEdit({ ...values, id: result.id });
                setTab("instructions");
                setNewOpen(false);
                setNewName("");
                notify(
                  "Agent created. Add your instructions or use the website assistant.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy("");
              }
            }}
          >
            <p className="muted">
              Give your agent a name. You can generate its instructions from a
              website in the next step.
            </p>
            <label>
              Agent name
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. AirAsia travel assistant"
                required
                maxLength={100}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button primary" disabled={Boolean(busy)}>
              {busy === "new" ? "Creating…" : "Create agent"}
              <ChevronRight size={16} />
            </button>
            <small>Start the voice server with ./deploy.sh --env local.</small>
          </form>
        </Modal>
      )}
      {draft && (
        <Modal
          title="Your researched prompt"
          onClose={() => setDraft(null)}
          wide
        >
          <div className="modal-content">
            <div className="import-info">
              <Sparkles size={25} />
              <div>
                <strong>A starting point, shaped around your business.</strong>
                <p>
                  Review business facts and capabilities before applying this
                  draft.
                </p>
              </div>
            </div>
            <textarea
              className="draft-text"
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
            {draft.sources.length > 0 && (
              <div className="research-sources">
                <strong>Research sources</strong>
                {draft.sources.slice(0, 8).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="button" onClick={() => setDraft(null)}>
                Discard draft
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setEdit({ ...edit, system_prompt: draft.text });
                  setDraft(null);
                  notify(
                    "Draft applied to the editor. Save changes when you’re ready.",
                  );
                }}
              >
                <Check size={15} /> Apply to system prompt
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Delete this agent?"
          onClose={() => setConfirm(null)}
        >
          <div className="modal-content">
            <p>The agent configuration will be deleted. Call history and shared workspace knowledge will be preserved.</p>
            <div className="modal-actions">
              <button className="button" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={Boolean(busy)}
                onClick={async () => {
                        setBusy("action");
                        try {
                          await api(`agents/${selected}`, "DELETE");
                          setConfirm(null);
                          const next = data.agents.find(
                            (a) => a.id !== selected,
                          );
                          if (next) choose(next);
                          else setSelected("");
                          await refresh();
                          notify("Agent deleted.");
                        } catch (e) {
                          setError((e as Error).message);
                          setConfirm(null);
                        } finally {
                          setBusy("");
                        }
                      }
                }
              >
                {busy ? "Working…" : "Confirm delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
