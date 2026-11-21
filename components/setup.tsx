"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Setup({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email: form.get("email"), password: form.get("password") }) });
      const data = await r.json(); if (!r.ok) throw Error(data.error); window.location.href = "/login";
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <main className="login-page"><section className="login-form"><div className="login-form-inner"><h1>Set up your account</h1><p>Choose the email and password you want to use for your workspace.</p><form onSubmit={submit}><label>Email address<Input name="email" type="email" autoComplete="username" required /></label><label>Password<Input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>{error && <p role="alert">{error}</p>}<Button variant="ghost" className="button primary" disabled={busy || !token}>Create account</Button></form></div></section></main>;
}
