"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { ArrowUpRight, AudioLines } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPassword({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/password-reset", {
        method: token ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password } : { email }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setMessage(token ? "Your password is updated. You can sign in now." : "If an account uses that email, we’ll send a password reset link shortly.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to process your request.");
    } finally {
      setBusy(false);
    }
  }

  return <Box className="berry-auth"><Card className="berry-auth-card"><CardContent>
    <Link className="berry-brand" href="https://serendibai.lk"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</Link>
    <Typography component="h1" variant="h4" className="berry-auth-title">{token ? "Set a new password" : "Reset your password"}</Typography>
    <Typography color="text.secondary">{token ? "Choose a new password for your account." : "Enter your account email and we’ll send you a reset link."}</Typography>
    {message ? <><p className="password-reset-message" role="status">{message}</p><Link className="berry-auth-back" href="/login">Back to sign in <ArrowUpRight size={14} /></Link></> : <form className="berry-auth-form" onSubmit={submit}>
      {!token ? <label htmlFor="reset-email">Email address<Input id="reset-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label> : <>
        <label htmlFor="reset-password">New password<Input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label htmlFor="reset-confirm">Confirm new password<Input id="reset-confirm" name="confirm" type="password" autoComplete="new-password" maxLength={200} required value={confirm} onChange={event => setConfirm(event.target.value)} /></label>
      </>}
      {confirm && password !== confirm && <p className="password-reset-error">Passwords don’t match.</p>}
      {error && <p className="password-reset-error" role="alert">{error}</p>}
      <Button className="button primary" disabled={busy || (!!token && (password.length < 12 || password !== confirm))}>{busy ? "Please wait…" : token ? "Update password" : "Send reset link"}</Button>
      <Link className="berry-auth-back" href="/login">Back to sign in <ArrowUpRight size={14} /></Link>
    </form>}
  </CardContent></Card></Box>;
}
