"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AgentCase } from "@/lib/cases";

type Selection = { id: string; state: string; title: string; callerHint: string; error: string };
const statuses: Record<string, [string, string]> = {
  pending: ["Preparing your callback", "Keep WhatsApp available. We are checking call permission."],
  preparing: ["Preparing your callback", "Keep WhatsApp available. We are checking call permission."],
  permission: ["Approve the call request", "We sent a WhatsApp call-permission request to your number. Accept it and your selected agent will call automatically. You do not need to message or call us."],
  calling: ["Your agent is calling", "Answer the incoming WhatsApp call from SerendibAI to speak with your selected case agent."],
  completed: ["Your demo call has ended", "Choose another case when you are ready for your next recording."],
  consumed: ["Your demo call has ended", "Choose another case when you are ready for your next recording."],
  declined: ["Call permission was declined", "No call will be placed. You can request another demo when you are ready."],
  failed: ["Your callback could not be completed", "Please try again shortly."],
  expired: ["Your callback request expired", "Submit your number again when you are ready."],
};

export function CaseDemo({ cases }: { cases: AgentCase[] }) {
  const [selected, setSelected] = useState(cases[0]?.slug || "sales");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = cases.find((item) => item.slug === selected);
  const id = selection?.id;
  const state = selection?.state;

  useEffect(() => {
    if (!id || !state || !["pending", "preparing", "permission", "calling"].includes(state)) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/cases?id=${id}`, { cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          setSelection((current) => current?.id === id ? { id, ...result } : current);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [id, state]);

  async function requestCall(phone: string, company = "") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, case: selected, company }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSelection(result);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void requestCall(String(data.get("phone") || ""), String(data.get("company") || ""));
  }

  return <main className="case-studio">
    <Link href="https://serendibai.lk" className="case-brand">SerendibAI</Link>
    <p className="case-eyebrow">Demo studio</p>
    <h1>Try an outbound conversation.</h1>
    <p className="case-intro">Choose an example for a WhatsApp callback. Calls start in English and follow your language.</p>
    <div className="case-tabs" aria-label="Choose a demo case">{cases.map((item) => <button key={item.slug} disabled={busy} aria-pressed={selected === item.slug} onClick={() => { setSelected(item.slug); setSelection(null); setError(""); }}>{item.title}</button>)}</div>
    <section className="case-card">
      <div><p className="case-eyebrow">{current?.title} agent · Fictional business</p><h2>{current?.company_name}</h2><p>{current?.description}</p><p className="case-hint">{current?.caller_hint}</p><p>Use fictional details. These agents create demo records only. Calls are recorded and transcribed; public showcase clips will be selected separately.</p></div>
      <div className="case-form">
        {!selection ? <div className="case-call-options">
          <button type="button" className="case-primary" disabled={busy || !current?.available} onClick={() => void requestCall("+94742530708")}>{busy ? "Preparing your call…" : current?.available ? "Call +94 74 253 0708" : "Demo agents are offline"}</button>
          <form onSubmit={submit}>
            <label htmlFor="case-phone">Or call another WhatsApp number</label>
            <input id="case-phone" name="phone" type="tel" autoComplete="tel" placeholder="+94 77 123 4567" maxLength={30} required />
            <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="case-trap" defaultValue="" />
            <button className="case-primary" disabled={busy || !current?.available}>Call this number</button>
          </form>
          <p>Calls are recorded and transcribed. WhatsApp may ask you to approve the call first.</p>
        </div> : <div role="status" aria-live="polite">
          <h3>{statuses[selection.state]?.[0] || "Preparing your callback"}</h3>
          <p>{selection.error || statuses[selection.state]?.[1]}</p>
          {!["pending", "preparing", "permission", "calling"].includes(selection.state) && <button className="case-reset" onClick={() => setSelection(null)}>Select again</button>}
        </div>}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
    <p className="case-note">Already approved WhatsApp calls from us? We call immediately. Otherwise, accept the permission request and we call automatically. <Link href="/cases/transcripts">View case transcripts</Link></p>
  </main>;
}
