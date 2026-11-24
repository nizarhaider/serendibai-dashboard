"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowUpRight, AudioLines, Loader2 } from "lucide-react";
import Link from "next/link";
export function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <Box className="berry-auth">
      <Card className="berry-auth-card"><CardContent>
        <a className="berry-brand" href="https://serendibai.lk"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</a>
        <Typography component="h1" variant="h4" className="berry-auth-title">Welcome back</Typography>
        <Typography color="text.secondary">Sign in to your workspace</Typography>
        <form className="berry-auth-form" onSubmit={submit}>
          <label>Email address<Input name="email" type="email" autoComplete="username" placeholder="you@company.com" required /></label>
          <label>Password<Input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
          <Link className="login-forgot" href="/forgot-password">Forgot password?</Link>
          {error && <div className="error" role="alert">{error}</div>}
          <Button variant="ghost" className="button primary" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : null}{busy ? "Signing in…" : "Sign in"}<ArrowUpRight size={18} /></Button>
        </form>
        <a className="berry-auth-back" href="https://serendibai.lk">Back to serendibai.lk <ArrowUpRight size={14} /></a>
      </CardContent></Card>
    </Box>
  );
}
