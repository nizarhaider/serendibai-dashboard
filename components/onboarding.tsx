"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Agent } from "@/lib/types";
import { api } from "./portal";

type LinkState = { agent_id?: string; enabled: boolean; status: string; qr?: string | null; error?: string };

export function Onboarding({ agents }: { agents: Agent[] }) {
  const [link, setLink] = useState<LinkState>({ enabled: false, status: "offline" });
  const [agent, setAgent] = useState(agents[0]?.id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await api("onboarding");
      setLink(next);
      if (next.agent_id) setAgent(next.agent_id);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { const initial = setTimeout(refresh, 0); const timer = setInterval(refresh, link.status === "pairing" || link.status === "connecting" ? 5000 : 60000); return () => { clearTimeout(initial); clearInterval(timer); }; }, [refresh, link.status]);
  async function update(enabled: boolean) {
    setBusy(true); setError("");
    try { await api("onboarding", "POST", { agent_id: agent, enabled }); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel" style={{ padding: 24, maxWidth: 680 }}>
    <h2>Connect WhatsApp</h2>
    <p>Link your WhatsApp Business account and choose the agent that answers incoming calls. This experimental connection uses an unofficial linked device.</p>
    <p>Keep your phone connected and scan only your own account. You can turn off AI answering here.</p>
    <label>Voice agent <select value={agent} onChange={e => setAgent(e.target.value)} disabled={busy || link.enabled}>
      {agents.filter(a => a.status !== "archived").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select></label>
    <p>Status: <strong>{link.status.replaceAll("_", " ")}</strong></p>
    {link.qr && link.enabled && <div><p>In WhatsApp Business, open Linked devices, tap Link a device, and scan this code.</p><Image unoptimized src={`data:image/png;base64,${link.qr}`} alt="WhatsApp device pairing QR code" width={256} height={256} /></div>}
    {link.error && <p role="alert">{link.error}</p>}{error && <p role="alert">{error}</p>}{link.status === "connected" && <p>WhatsApp is connected. <Link className="button primary" href="/dashboard">Continue to workspace</Link></p>}
    <button className="button primary" disabled={busy || !agent} onClick={() => update(!link.enabled)}>{link.enabled ? "Turn off AI answering" : "Connect and turn on AI answering"}</button>
  </section>;
}
