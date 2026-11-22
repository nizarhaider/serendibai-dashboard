"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { Agent } from "@/lib/types";
import { api } from "./portal";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";

type Connection = { id: string; agent_id: string; phone: string; status: string; qr?: string | null; error?: string; voice_enabled: boolean; message_replies_enabled: boolean; message_reply_instructions: string };
const steps = ["Choose assistant", "Prepare phone", "Scan QR code", "Finish setup"];

function Setup({ agents, businessName, standalone, onDone, initial }: { agents: Agent[]; businessName?: string; standalone?: boolean; onDone?: () => void; initial?: Connection }) {
  const [agent, setAgent] = useState(agents[0]?.id || "");
  const [link, setLink] = useState<Connection | null>(initial || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const links: Connection[] = await api("onboarding");
      setLink(current => current ? links.find(item => item.id === current.id) || null : standalone ? links.find(item => item.status !== "connected") || links[0] || null : null);
    } catch (e) { setError((e as Error).message); }
  }, [standalone]);
  useEffect(() => { const initial = setTimeout(refresh, 0); const timer = setInterval(refresh, 5000); return () => { clearTimeout(initial); clearInterval(timer); }; }, [refresh]);
  async function start() {
    setBusy(true); setError("");
    try {
      const result = await api("onboarding", "POST", { agent_id: agent, ...(link ? { id: link.id } : {}) });
      const links: Connection[] = await api("onboarding");
      setLink(links.find(item => item.id === result.id) || null);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const activeStep = link?.status === "connected" ? 4 : link?.qr ? 3 : link ? 2 : 1;
  const setup = <>
    <div className="setup-stepper" aria-label="WhatsApp setup progress">{steps.map((label, index) => <div className={`setup-step ${index + 1 < activeStep ? "complete" : index + 1 === activeStep ? "current" : ""}`} key={label}><span className="setup-step-number">{index + 1 < activeStep ? <Check size={16} /> : index + 1}</span><span>{label}</span></div>)}</div>
    <div className="setup-content-grid"><section className="setup-action-card">
      {activeStep === 1 && <><span className="setup-stage-label">STEP 1</span><h2>Choose your assistant</h2><label className="setup-select-label">Voice assistant<Select value={agent} onValueChange={setAgent}><SelectTrigger className="w-full min-h-12 px-4"><SelectValue placeholder="Select an assistant" /></SelectTrigger><SelectContent>{agents.filter(item => item.status !== "archived").map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label><Button className="button primary setup-primary" disabled={busy || !agent} onClick={start}>Continue <ArrowRight size={17} /></Button></>}
      {(activeStep === 2 || activeStep === 3) && <><span className="setup-stage-label">STEP {activeStep}</span><h2>{activeStep === 2 ? "Open WhatsApp Business" : "Scan the QR code"}</h2><p>On your phone, open WhatsApp Business → Linked devices → Link a device.</p>{link?.qr ? <div className="setup-qr-frame"><Image unoptimized src={`data:image/png;base64,${link.qr}`} alt="WhatsApp pairing QR code" width={232} height={232} /></div> : link?.status === "error" ? <Button className="button primary setup-primary" disabled={busy} onClick={start}>Try again</Button> : <div className="setup-waiting"><LoaderCircle size={17} /> Preparing QR code…</div>}</>}
      {activeStep === 4 && <div className="setup-success"><span className="setup-success-icon"><Check size={28} /></span><span className="setup-stage-label">STEP 4 · COMPLETE</span><h2>WhatsApp connected</h2><p>{link?.phone ? `+${link.phone}` : "Your number is ready."}</p>{standalone ? <Link className="button primary setup-primary" href="/dashboard">Open workspace <ArrowRight size={17} /></Link> : <Button className="button primary setup-primary" onClick={onDone}>Done</Button>}</div>}
      {(error || link?.error) && <div className="setup-alert" role="alert">{error || link?.error}</div>}
      {!standalone && activeStep !== 4 && <div className="setup-back"><Button variant="outline" onClick={onDone}>Back to connections</Button></div>}
    </section></div>
  </>;
  if (!standalone) return <section className="onboarding-inline">{setup}</section>;
  return <main className="setup-page"><header className="setup-header"><Link className="setup-brand" href="/"><span className="setup-brand-icon"><AudioLines size={20} /></span>Serendib<span>AI</span></Link><span className="setup-header-label">Onboarding</span></header><section className="setup-main"><div className="setup-heading"><span className="setup-eyebrow">WELCOME TO {businessName?.toUpperCase() || "SERENDIBAI"}</span><h1>Connect WhatsApp</h1></div>{setup}</section></main>;
}

export function Onboarding({ agents, businessName }: { agents: Agent[]; businessName?: string; standalone?: boolean }) { return <Setup agents={agents} businessName={businessName} standalone />; }

export function Connections({ agents }: { agents: Agent[] }) {
  const [links, setLinks] = useState<Connection[]>([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Connection>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { try { setLinks(await api("connections")); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { const initial = setTimeout(refresh, 0); return () => clearTimeout(initial); }, [refresh]);
  async function change(id: string, values: Partial<Connection>) {
    setBusy(id); setError("");
    try { await api(`connections/${id}`, "PATCH", values); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  async function remove(link: Connection) {
    if (!window.confirm(`Delete ${link.phone ? `+${link.phone}` : "this connection"} and unlink it from WhatsApp?`)) return;
    setBusy(link.id); setError("");
    try { await api(`connections/${link.id}`, "DELETE"); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  if (adding) return <Setup agents={agents} initial={selected} onDone={() => { setAdding(false); setSelected(undefined); void refresh(); }} />;
  return <section className="connections"><div className="connections-header"><h2>WhatsApp numbers</h2><button className="button primary" onClick={() => setAdding(true)}><Plus size={16} /> Add number</button></div>{error && <div className="setup-alert" role="alert">{error}</div>}{!links.length && <p>No numbers connected.</p>}{links.map(link => <div className="connection" key={link.id}><div className="connection-heading"><div><strong>{link.phone ? `+${link.phone}` : "WhatsApp connection"}</strong><small>{link.status}</small>{link.status !== "connected" && <button className="setup-cancel" onClick={() => { setSelected(link); setAdding(true); }}>Continue setup</button>}</div><button className="icon-button" disabled={!!busy} aria-label="Delete connection" onClick={() => remove(link)}><Trash2 size={17} /></button></div><label className="message-reply-toggle"><span>Answer calls</span><Switch aria-label="Answer calls" checked={link.voice_enabled} disabled={!!busy} onCheckedChange={checked => change(link.id, { voice_enabled: checked })} /></label><label className="message-reply-toggle"><span>Reply to messages <small>Not active yet</small></span><Switch aria-label="Reply to messages" checked={link.message_replies_enabled} disabled={!!busy} onCheckedChange={checked => change(link.id, { message_replies_enabled: checked })} /></label></div>)}</section>;
}
