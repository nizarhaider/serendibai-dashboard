"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, Check, LoaderCircle, Smartphone } from "lucide-react";
import type { Agent } from "@/lib/types";
import { api } from "./portal";

type LinkState = { agent_id?: string; enabled: boolean; status: string; qr?: string | null; error?: string };
const steps = ["Choose assistant", "Prepare phone", "Scan QR code", "Finish setup"];

export function Onboarding({ agents, businessName, standalone = false }: { agents: Agent[]; businessName?: string; standalone?: boolean }) {
  const [link, setLink] = useState<LinkState>({ enabled: false, status: "offline" });
  const [agent, setAgent] = useState(agents[0]?.id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await api("onboarding");
      setLink(next);
      if (next.agent_id) setAgent(next.agent_id);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, link.status === "pairing" || link.status === "connecting" ? 5000 : 60000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh, link.status]);
  async function update(enabled: boolean) {
    setBusy(true); setError("");
    try { await api("onboarding", "POST", { agent_id: agent, enabled }); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const connected = link.status === "connected";
  const pairing = Boolean(link.qr && link.enabled);
  const activeStep = connected ? 4 : pairing ? 3 : link.enabled || link.status === "error" ? 2 : 1;
  const selectedAgent = agents.find(item => item.id === agent);
  const progress = <div className="setup-stepper" aria-label="WhatsApp setup progress">{steps.map((label, index) => {
    const number = index + 1;
    return <div className={`setup-step ${number < activeStep ? "complete" : number === activeStep ? "current" : ""}`} key={label}><span className="setup-step-number">{number < activeStep ? <Check size={16} /> : number}</span><span>{label}</span></div>;
  })}</div>;
  const setup = <>
    {progress}
    <div className="setup-content-grid">
      <section className="setup-action-card">
        {activeStep === 1 && <>
          <span className="setup-stage-label">STEP 1 · CHOOSE YOUR ASSISTANT</span>
          <h2>Who should answer your calls?</h2>
          <p>Choose the voice assistant for incoming calls to this WhatsApp Business account.</p>
          {agents.length ? <label className="setup-select-label">Voice assistant<select value={agent} onChange={event => setAgent(event.target.value)} disabled={busy}><option value="" disabled>Select an assistant</option>{agents.filter(item => item.status !== "archived").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <div className="setup-alert" role="status">There isn’t a voice assistant in this workspace yet. Ask your administrator to add one.</div>}
          {error && <div className="setup-alert" role="alert">{error}</div>}
          <button className="button primary setup-primary" disabled={busy || !agent} onClick={() => update(true)}>{busy ? "Preparing setup…" : "Continue to phone setup"}<ArrowRight size={17} /></button>
        </>}
        {activeStep === 2 && <>
          <span className="setup-stage-label">STEP 2 · PREPARE YOUR PHONE</span>
          <h2>Open WhatsApp Business</h2>
          <p>On the phone that uses this WhatsApp Business number, open the app and follow these steps:</p>
          <ol className="setup-phone-steps"><li><span>1</span><div>Open <strong>Settings</strong> or the <strong>⋮ menu</strong>.</div></li><li><span>2</span><div>Choose <strong>Linked devices</strong>.</div></li><li><span>3</span><div>Tap <strong>Link a device</strong>. Keep this page open.</div></li></ol>
          <div className="setup-waiting"><LoaderCircle size={17} /><span>{link.status === "error" ? "The connection needs another try." : "Preparing your secure QR code…"}</span></div>
          {error && <div className="setup-alert" role="alert">{error}</div>}
          {link.status === "error" && <button className="button primary setup-primary" disabled={busy} onClick={() => update(true)}>{busy ? "Trying again…" : "Try again"}<ArrowRight size={17} /></button>}
          {link.enabled && !connected && <button className="setup-cancel" disabled={busy} onClick={() => update(false)}>Cancel setup</button>}
        </>}
        {activeStep === 3 && <>
          <span className="setup-stage-label">STEP 3 · SCAN THE CODE</span>
          <h2>Link your phone</h2>
          <p>Use WhatsApp Business on your phone to scan this code. Your regular app stays available on the phone.</p>
          <div className="setup-qr-frame"><Image unoptimized src={`data:image/png;base64,${link.qr}`} alt="Temporary WhatsApp device pairing QR code" width={232} height={232} /></div>
          <div className="setup-waiting"><LoaderCircle size={17} /><span>Waiting for your phone to confirm the link…</span></div>
          {error && <div className="setup-alert" role="alert">{error}</div>}
          <button className="setup-cancel" disabled={busy} onClick={() => update(false)}>Cancel setup</button>
        </>}
        {activeStep === 4 && <div className="setup-success">
          <span className="setup-success-icon"><Check size={28} /></span>
          <span className="setup-stage-label">STEP 4 · COMPLETE</span>
          <h2>Your WhatsApp is connected</h2>
          <p>Incoming WhatsApp calls will be handled by <strong>{selectedAgent?.name || "your selected voice assistant"}</strong>. You can keep using WhatsApp Business on your phone.</p>
          {standalone && <Link className="button primary setup-primary" href="/dashboard">Open my workspace<ArrowRight size={17} /></Link>}
        </div>}
      </section>
      <aside className="setup-aside">
        <div className="setup-aside-icon"><Smartphone size={19} /></div>
        <h3>Your phone stays yours</h3>
        <p>This links a companion device to your WhatsApp Business account. Keep your phone connected and use it as usual.</p>
        <div className="setup-aside-note"><AudioLines size={16} /><span>Your call assistant: <strong>{selectedAgent?.name || "Choose in step 1"}</strong></span></div>
      </aside>
    </div>
  </>;
  if (!standalone) return <section className="onboarding-inline">{setup}</section>;
  return <main className="setup-page">
    <header className="setup-header"><Link className="setup-brand" href="/"><span className="setup-brand-icon"><AudioLines size={20} /></span>Serendib<span>AI</span></Link><span className="setup-header-label">Workspace setup <i /> {activeStep} of 4</span></header>
    <section className="setup-main"><div className="setup-heading"><span className="setup-eyebrow">WELCOME TO {businessName?.toUpperCase() || "SERENDIBAI"}</span><h1>Set up WhatsApp calling</h1><p>Follow these four steps to connect your business number and route incoming calls to your voice assistant.</p></div>{setup}</section>
    <footer className="setup-footer">Need a hand? Contact your SerendibAI administrator.</footer>
  </main>;
}
