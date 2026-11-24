"use client";
import { Card, Switch, Tab, Tabs } from "@mui/material";
import { NativeSelect } from "./ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  CalendarDays,
  ChevronRight,
  Code2,
  Loader2,
  MessageSquare,
  PackageCheck,
  Plus,
  Save,
  Settings2,
  Ticket,
  Archive,
} from "lucide-react";
import type { Agent, Customer, PortalData } from "@/lib/types";
import { standardTools, toolNames } from "@/lib/permissions";
import { api, Modal, number, Status } from "./portal";

const defaultAgent = () => ({
  name: "",
  company_name: "",
  company_url: "",
  greeting: "",
  system_prompt: "",
  text_reply_instructions: "",
  voice: "Aoede",
  languages: ["English", "Sinhala", "Tamil"],
  tools: [...standardTools, ...toolNames],
  max_calls: 3,
  phone_number_id: "",
});
type Editable = Omit<ReturnType<typeof defaultAgent>, "tools"> & {
  tools: string[];
  id?: string;
};
export function Agents({
  data,
  refresh,
  notify,
  customers,
  workspace,
}: {
  data: PortalData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  customers: Customer[];
  workspace: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(data.agents[0]?.id || ""),
    [edit, setEdit] = useState<Editable>(data.agents[0] || defaultAgent()),
    [tab, setTab] = useState("instructions"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [newOpen, setNewOpen] = useState(false),
    [newGreeting, setNewGreeting] = useState(""),
    [newPrompt, setNewPrompt] = useState(""),
    [newTextReplyInstructions, setNewTextReplyInstructions] = useState(""),
    [confirm, setConfirm] = useState(false),
    [secrets, setSecrets] = useState<Record<string, string>>({});
  const current = data.agents.find((a) => a.id === selected);
  const dirty =
    Boolean(
      current &&
      (
        Object.keys(defaultAgent()) as (keyof ReturnType<typeof defaultAgent>)[]
      ).some(
        (key) => JSON.stringify(edit[key]) !== JSON.stringify(current[key]),
      ),
    ) || Object.values(secrets).some(Boolean);
  function choose(a: Agent) {
    if (
      a.id === selected ||
      (dirty && !window.confirm("Discard unsaved changes and switch agents?"))
    )
      return;
    setSelected(a.id);
    setEdit(a);
    setError("");
    setSecrets({});
  }
  async function save() {
    setBusy("save");
    setError("");
    try {
      await api(`agents/${selected}?workspace=${workspace}`, "PUT", { ...edit, credentials: secrets });
      setSecrets({});
      await refresh();
      notify("Agent configuration saved.");
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
  const activeVoiceConnection = Boolean(current?.active_voice_connection);
  const runtimeStatus = activeVoiceConnection ? "connected" :
    current?.status === "ready" && !heartbeatFresh
      ? "offline"
      : current?.status || "draft";
  return (
    <>
      <label className="agent-workspace-picker">Workspace <NativeSelect value={workspace} onChange={(event) => { router.push(`/agents${event.target.value ? `?workspace=${event.target.value}` : ""}`); }}><option value="" disabled>Select a customer workspace</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.business_name}</option>)}</NativeSelect></label>
      <div className="agents-toolbar">
        <div className="agent-count">
          <strong>
            {data.agents.length} voice agent
            {data.agents.length !== 1 ? "s" : ""}
          </strong>
        </div>
        <Button variant="ghost" className="button primary" disabled={!workspace} onClick={() => setNewOpen(true)}>
          <Plus size={17} /> New voice agent
        </Button>
      </div>
      {error && (
        <div className="toast error" role="alert">
          {error}
        </div>
      )}
      <div className="agent-workspace">
        <aside className="agent-list">
          {data.agents.map((a) => (
            <Button variant="ghost"
              key={a.id}
              className={`agent-list-card ${a.id === selected ? "selected" : ""}`}
              onClick={() => choose(a)}
            >
              <strong>{a.name}</strong>
              <span className="agent-domain">
                {a.company_name || "Voice agent"}
              </span>
              <Status
                value={
                  a.active_voice_connection
                    ? "connected"
                    : a.status === "ready" &&
                  (!a.heartbeat_at ||
                    data.generatedAt - new Date(a.heartbeat_at).getTime() >
                      90000)
                    ? "offline"
                    : a.status
                }
              />
            </Button>
          ))}
        </aside>
        {current ? (
          <Card component="section" className="panel agent-editor">
            <div className="agent-editor-heading">
              <div>
                <h2>{current.name}</h2>
              </div>
              <div>
                {dirty && <small className="muted">Unsaved changes</small>}
                <Status value={runtimeStatus} />
                <Button variant="ghost"
                  className="button primary"
                  disabled={Boolean(busy) || !dirty}
                  onClick={save}
                >
                  {busy === "save" ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  Save changes
                </Button>
              </div>
            </div>
            <Tabs value={tab} onChange={(_, value: string) => setTab(value)} variant="scrollable" scrollButtons="auto" className="editor-tabs" aria-label="Voice agent settings">
              <Tab value="instructions" label="Instructions" icon={<MessageSquare size={16} />} iconPosition="start" />
              <Tab value="tools" label="Actions" icon={<Settings2 size={16} />} iconPosition="start" />
              <Tab value="settings" label="Settings" icon={<Code2 size={16} />} iconPosition="start" />
            </Tabs>
            <div className="editor-content">
              {tab === "instructions" ? (
                <>
                  <div className="prompt-label">
                    <label htmlFor="agent-greeting">Opening greeting</label>
                    <span>{number(edit.greeting.length)} characters</span>
                  </div>
                  <div className="prompt-editor">
                    <Textarea
                      id="agent-greeting"
                      rows={2}
                      value={edit.greeting}
                      required
                      maxLength={1500}
                      onChange={(e) => setEdit({ ...edit, greeting: e.target.value })}
                    />
                  </div>
                  <div className="prompt-label">
                    <label htmlFor="system-prompt">Call system prompt &amp; instructions</label>
                    <span>{number(edit.system_prompt.length)} characters</span>
                  </div>
                  <div className="prompt-editor">
                    <Textarea
                      id="system-prompt"
                      rows={6}
                      value={edit.system_prompt}
                      required
                      maxLength={30000}
                      onChange={(e) => setEdit({ ...edit, system_prompt: e.target.value })}
                    />
                  </div>
                  <div className="prompt-label">
                    <label htmlFor="text-reply-instructions">Text reply instructions</label>
                    <span>{number(edit.text_reply_instructions.length)} characters</span>
                  </div>
                  <div className="prompt-editor">
                    <Textarea
                      id="text-reply-instructions"
                      rows={4}
                      value={edit.text_reply_instructions}
                      maxLength={30000}
                      onChange={(e) => setEdit({ ...edit, text_reply_instructions: e.target.value })}
                    />
                  </div>
                </>
              ) : tab === "tools" ? (
                <>
                  <h3>Agent actions</h3>
                  <p className="muted">
                    Knowledge and catalogue answers are always available.
                    WhatsApp follow-ups are sent when useful. Choose which
                    customer actions this agent can take.
                  </p>
                  <div className="tool-options">
                    {[
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
                    ]
                      .filter((t) => data.allowed_tools.includes(t.name))
                      .map((t) => (
                        <label className="tool-option" key={t.name}>
                          <span className="icon-tile">
                            <t.icon size={21} />
                          </span>
                          <span>
                            <strong>{t.title}</strong>
                            <small>{t.text}</small>
                          </span>
                          <Switch
                            slotProps={{ input: { "aria-label": t.title } }}
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
                </>
              ) : (
                <>
                  <details className="settings-disclosure">
                    <summary>Service status</summary>
                    <div className="runtime-details">
                      {activeVoiceConnection ? <>
                        <h3>WhatsApp voice service</h3>
                        <div><span>Status</span><Status value="connected" /></div>
                        <div><span>Voice calls</span><code>Enabled while WhatsApp is connected</code></div>
                      </> : <>
                        <h3>Voice server</h3>
                        <div><span>Status</span><Status value={heartbeatFresh ? current.status : "offline"} /></div>
                        <div><span>Active calls</span><code>{heartbeatFresh ? number(Number(current.telemetry.active_calls || 0)) : "—"}</code></div>
                        <div><span>Last heartbeat</span><code>{current.heartbeat_at ? new Date(current.heartbeat_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo" }) : "Never"}</code></div>
                        <div><span>Configuration</span><code>saved v{current.version} / running {current.deployed_version > 0 ? `v${current.deployed_version}` : "—"}</code></div>
                        <div><span>Health</span><code>{current.telemetry.error ? String(current.telemetry.error) : heartbeatFresh ? "Runtime responding" : "Not responding"}</code></div>
                      </>}
                    </div>
                  </details>
                  <details className="settings-disclosure">
                    <summary>WhatsApp connection</summary>
                    <h3>WhatsApp Business connection</h3>
                    <p className="muted">
                      Connect this agent to your business number. Credentials
                      are encrypted and never sent back to the browser.
                    </p>
                    <label>
                      Phone number ID
                      <Input
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
                        {
                          key: "WHATSAPP_APP_SECRET",
                          label: "Meta app secret",
                        },
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
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder={
                              current.has_credentials
                                ? "Saved securely · leave blank to keep"
                                : "Enter credential"
                            }
                            value={secrets[s.key] || ""}
                            onChange={(e) =>
                              setSecrets({
                                ...secrets,
                                [s.key]: e.target.value,
                              })
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
                      verification token, and subscribe to call events. A Meta
                      app secret is required for the portal webhook.
                    </p>
                  </details>
                  <Button variant="ghost"
                    className="button danger-outline"
                    disabled={Boolean(busy)}
                    onClick={() => setConfirm(true)}
                  >
                    <Archive size={15} /> Archive agent
                  </Button>
                </>
              )}
            </div>
          </Card>
        ) : (
          <Card component="section" className="panel empty agent-empty">
            <AudioLines size={40} />
            <h2>Create your first voice agent</h2>
            <p>Add instructions for calls and text replies.</p>
            <Button variant="ghost" className="button primary" disabled={!workspace} onClick={() => setNewOpen(true)}>
              <Plus size={17} /> Create voice agent
            </Button>
          </Card>
        )}
      </div>
      {newOpen && (
        <Modal title="Create a voice agent" onClose={() => setNewOpen(false)}>
          <form
            className="modal-content form-stack agent-create-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy("new");
              setError("");
              try {
                const companyName = customers.find((customer) => customer.id === workspace)?.business_name || "Voice agent";
                const agentIndex = data.agents.filter((agent) => agent.company_name === companyName).length;
                const values = {
                  ...defaultAgent(),
                  tools: defaultAgent().tools.filter(
                    (tool) =>
                      !toolNames.includes(tool as (typeof toolNames)[number]) ||
                      data.allowed_tools.includes(tool),
                  ),
                  name: `${companyName.slice(0, 86)} agent${agentIndex ? ` ${agentIndex + 1}` : ""}`,
                  company_name: companyName,
                  greeting: newGreeting.trim(),
                  system_prompt: newPrompt.trim(),
                  text_reply_instructions: newTextReplyInstructions.trim(),
                };
                const result = await api(`agents?workspace=${workspace}`, "POST", values);
                await refresh();
                setSelected(result.id);
                setEdit({ ...values, id: result.id });
                setTab("instructions");
                setNewOpen(false);
                setNewGreeting("");
                setNewPrompt("");
                setNewTextReplyInstructions("");
                notify("Agent created.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy("");
              }
            }}
          >
            <label>
              Opening greeting
              <Textarea
                autoFocus
                rows={2}
                value={newGreeting}
                onChange={(e) => setNewGreeting(e.target.value)}
                required
                maxLength={1500}
              />
            </label>
            <label>
              Call system prompt &amp; instructions
              <Textarea
                rows={6}
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                required
                maxLength={30000}
              />
            </label>
            <label>
              Text reply instructions
              <Textarea
                rows={4}
                value={newTextReplyInstructions}
                onChange={(e) => setNewTextReplyInstructions(e.target.value)}
                maxLength={30000}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <Button variant="ghost" className="button primary" disabled={Boolean(busy) || !newGreeting.trim() || !newPrompt.trim()}>
              {busy === "new" ? "Creating…" : "Create agent"}
              <ChevronRight size={16} />
            </Button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal title="Archive this agent?" onClose={() => setConfirm(false)}>
          <div className="modal-content">
            <p>
              The agent will stop accepting calls. Its configuration, call history
              and shared workspace knowledge will be preserved.
            </p>
            <div className="modal-actions">
              <Button variant="ghost" className="button" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button variant="ghost"
                className="button danger"
                disabled={Boolean(busy)}
                onClick={async () => {
                  setBusy("action");
                  try {
                    await api(`agents/${selected}?workspace=${workspace}`, "DELETE");
                    setConfirm(false);
                    const next = data.agents.find((a) => a.id !== selected);
                    setSelected(next?.id || "");
                    setEdit(next || defaultAgent());
                    setSecrets({});
                    await refresh();
                    notify("Agent archived.");
                  } catch (e) {
                    setError((e as Error).message);
                    setConfirm(false);
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {busy ? "Working…" : "Archive agent"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
