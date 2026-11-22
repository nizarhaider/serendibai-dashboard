"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { AudioLines } from "lucide-react";
import Link from "next/link";
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
  return <Box className="berry-auth"><Card className="berry-auth-card"><CardContent>
    <Link className="berry-brand" href="/"><span className="brand-icon"><AudioLines size={22} /></span>SerendibAI</Link>
    <Typography component="h1" variant="h4" className="berry-auth-title">Set up your account</Typography>
    <Typography color="text.secondary">Choose the email and password for your workspace.</Typography>
    <form className="berry-auth-form" onSubmit={submit}><label>Email address<Input name="email" type="email" autoComplete="username" required /></label><label>Password<Input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>{error && <p role="alert">{error}</p>}<Button className="button primary" disabled={busy || !token}>Create account</Button></form>
  </CardContent></Card></Box>;
}
