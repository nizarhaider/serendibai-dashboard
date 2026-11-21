"use client";

import Link from "next/link";
import { useState } from "react";
import { AudioLines, Check, Eye, EyeOff, LockKeyhole } from "lucide-react";

export function Invite({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      window.location.assign("/onboarding");
    } catch (error) { setError((error as Error).message); setBusy(false); }
  }
  return <main className="setup-page">
    <header className="setup-header"><Link className="setup-brand" href="/"><span className="setup-brand-icon"><AudioLines size={20} /></span>Serendib<span>AI</span></Link><span className="setup-header-label"><LockKeyhole size={15} /> Secure account setup</span></header>
    <div className="invite-layout">
      <section className="invite-intro"><span className="setup-eyebrow">YOUR WORKSPACE IS READY</span><h1>A better way to handle every call.</h1><p>Create your password to get started. We’ll guide you through connecting your WhatsApp Business number next.</p><div className="invite-points"><span><Check size={16} /> Keep using WhatsApp Business on your phone</span><span><Check size={16} /> Choose the voice assistant for your calls</span><span><Check size={16} /> Review your workspace after setup</span></div></section>
      <section className="invite-card">
        <div className="invite-card-top"><span>ACCOUNT SETUP</span><span>STEP 1 <i /> 2</span></div>
        <h2>Create your password</h2><p className="invite-card-copy">Use this password the next time you sign in to your workspace.</p>
        <form onSubmit={submit}>
          <label htmlFor="invite-password">Password</label>
          <div className="invite-password-wrap"><input id="invite-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <label htmlFor="invite-confirm">Confirm password</label><input id="invite-confirm" name="confirm" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={200} required value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter it again" />
          <p className={`invite-requirement ${password.length >= 12 ? "met" : ""}`}><Check size={15} /> At least 12 characters</p>
          {confirm && password !== confirm && <p className="invite-inline-error">Passwords don’t match yet.</p>}
          {error && <p className="invite-error" role="alert">{error}</p>}
          {!token && <p className="invite-error" role="alert">This invitation link is incomplete. Ask your workspace administrator to send a new one.</p>}
          <button className="button primary invite-submit" disabled={busy || token.length < 32 || password.length < 12 || password !== confirm}>{busy ? "Setting up…" : "Set password & continue"}</button>
        </form>
        <p className="invite-expiry">Your one-time invitation link is valid for seven days.</p>
      </section>
    </div>
    <footer className="setup-footer">SerendibAI · Customer workspace setup</footer>
  </main>;
}
