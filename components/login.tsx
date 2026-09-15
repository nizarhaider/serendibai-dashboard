"use client";
import { useState } from "react";
import { ArrowUpRight, AudioLines, Loader2, ShieldCheck } from "lucide-react";
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
    <div className="login-page">
      <section className="login-story">
        <a className="brand" href="https://serendibai.lk">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          SerendibAI
        </a>
        <div className="login-statement">
          <span className="eyebrow light">ENGLISH · SINHALA · TAMIL</span>
          <h1>
            Your business.
            <br />Every conversation.
          </h1>
          <p>
            The workspace for voice agents that know your business as well as
            you do.
          </p>
          <div className="language-chips" aria-label="English, Sinhala, and Tamil">
            <span>EN</span><span lang="si">සිං</span><span lang="ta">த</span>
          </div>
        </div>
        <div className="login-bottom">
          <span>BUILT FOR YOUR BUSINESS</span>
          <span>Powered by SerendibAI</span>
        </div>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">YOUR AGENTS. YOUR WORKSPACE.</span>
          <h2>Welcome back.</h2>
          <p>Sign in to keep the conversation going.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? <Loader2 className="spin" size={17} /> : null}
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="secure-note">
            <ShieldCheck size={15} /> Secure, private business workspace
          </div>
        </div>
        <a className="back-link" href="https://serendibai.lk">
          Back to serendibai.lk <ArrowUpRight size={14} />
        </a>
      </section>
    </div>
  );
}
