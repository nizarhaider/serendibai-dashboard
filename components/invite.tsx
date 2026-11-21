"use client";
import { useState } from "react";

export function Invite({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      window.location.href = "/login";
    } catch (error) { setError((error as Error).message); setBusy(false); }
  }
  return <main className="login-page"><section className="login-form"><div className="login-form-inner"><h1>Finish setting up</h1><p>Choose a password for your SerendibAI workspace. You’ll connect WhatsApp after signing in.</p><form onSubmit={submit}><label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required /></label>{error && <p role="alert">{error}</p>}<button className="button primary" disabled={busy || token.length < 32}>{busy ? "Saving…" : "Set password"}</button></form>{!token && <p role="alert">This invitation link is missing or invalid.</p>}</div></section></main>;
}
