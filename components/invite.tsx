"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useState } from "react";
import { AudioLines, Check, Eye, EyeOff } from "lucide-react";

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
  return <Box className="berry-auth"><Card className="berry-auth-card"><CardContent>
    <Link className="berry-brand" href="/"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</Link>
    <Typography component="h1" variant="h4" className="berry-auth-title">Create your password</Typography>
    <Typography color="text.secondary">Set up your workspace to continue.</Typography>
    <form className="berry-auth-form" onSubmit={submit}>
      <div><label htmlFor="invite-password">Password</label><div className="invite-password-wrap"><Input id="invite-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" /><Button variant="ghost" type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</Button></div></div>
      <label htmlFor="invite-confirm">Confirm password<Input id="invite-confirm" name="confirm" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={200} required value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter it again" /></label>
      <p className={`invite-requirement ${password.length >= 12 ? "met" : ""}`}><Check size={15} /> At least 12 characters</p>
      {confirm && password !== confirm && <p className="invite-inline-error">Passwords don’t match yet.</p>}
      {error && <p className="invite-error" role="alert">{error}</p>}
      {!token && <p className="invite-error" role="alert">This invitation link is incomplete. Ask your workspace administrator to send a new one.</p>}
      <Button className="button primary" disabled={busy || token.length < 32 || password.length < 12 || password !== confirm}>{busy ? "Setting up…" : "Set password & continue"}</Button>
    </form>
    <p className="invite-expiry">Your one-time invitation link is valid for seven days.</p>
  </CardContent></Card></Box>;
}
