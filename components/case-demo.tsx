"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AgentCase } from "@/lib/cases";

type Selection = { id: string; state: string; title: string; callerHint: string; whatsappUrl: string | null };

export function CaseDemo({ cases }: { cases: AgentCase[] }) {
  const [selected, setSelected] = useState(cases[0]?.slug || "support");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = cases.find((item) => item.slug === selected);
  const id = selection?.id;
  const state = selection?.state;

  useEffect(() => {
    if (!id || !state || !["pending", "active"].includes(state)) return;
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.get("phone"), case: selected, consent: data.get("consent") === "on", company: data.get("company") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSelection(result);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return <main className="case-studio">
    <Link href="https://serendibai.lk" className="case-brand">SerendibAI</Link>
    <p className="case-eyebrow">Demo studio</p>
    <h1>Five ways to start a conversation.</h1>
    <p className="case-intro">Choose an agent, confirm your WhatsApp number, then call us. Each demo starts in English and follows your language.</p>
    <div className="case-tabs" aria-label="Choose a demo case">{cases.map((item) => <button key={item.slug} disabled={busy} aria-pressed={selected === item.slug} onClick={() => { setSelected(item.slug); setSelection(null); setError(""); }}>{item.title}</button>)}</div>
    <section className="case-card">
      <div><p className="case-eyebrow">{current?.title} agent</p><h2>{current?.description}</h2><p className="case-hint">{current?.caller_hint}</p><p>Use fictional details. These agents create demo records only. Calls are recorded and transcribed; public showcase clips will be selected separately.</p></div>
      <div className="case-form">
        {!selection ? <form onSubmit={submit}>
          <label htmlFor="case-phone">Your WhatsApp number</label>
          <input id="case-phone" name="phone" type="tel" autoComplete="tel" placeholder="+94 77 123 4567" maxLength={30} required />
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="case-trap" defaultValue="" />
          <label className="case-consent"><input type="checkbox" name="consent" required />I control this number and agree to a recorded AI demo call that I will initiate.</label>
          <button className="case-primary" disabled={busy || !current?.available}>{busy ? "Preparing…" : current?.available ? `Try ${current.title}` : "Demo agents are offline"}</button>
        </form> : <div role="status" aria-live="polite">
          <h3>{selection.state === "pending" ? "Confirm in WhatsApp" : selection.state === "active" ? "Ready for your call" : selection.state === "consumed" ? "Your case was connected" : "Your selection expired"}</h3>
          <p>{selection.state === "pending" ? "Open WhatsApp below and send the prepared message. This confirms your number and case. Then tap the voice call button in that chat." : selection.state === "active" ? `Call us from this WhatsApp number within ten minutes to speak with the ${selection.title} agent. This selection applies to one call.` : selection.state === "consumed" ? "Choose another case when you are ready for your next recording." : "Choose your case again to start a new ten-minute window."}</p>
          {selection.whatsappUrl && ["pending", "active"].includes(selection.state) && <a className="case-primary" href={selection.whatsappUrl} target="_blank" rel="noreferrer">Open WhatsApp</a>}
          <button className="case-reset" onClick={() => setSelection(null)}>Select again</button>
        </div>}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
    <p className="case-note">Select one case at a time for each number. Confirm each selection before calling. <Link href="/cases/transcripts">View case transcripts</Link></p>
  </main>;
}
