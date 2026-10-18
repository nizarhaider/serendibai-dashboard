import type { PortalData } from "@/lib/types";
import { Status } from "./portal";

export function CallHistory({ data }: { data: PortalData }) {
  const agent = data.agents.find(agent => agent.status !== "archived");
  return <>
    <section className="welcome-banner"><div>
      <span className="banner-label">{data.business_name}</span>
      <h2>Your callers and conversations.</h2>
      <p>Your information assistant guides callers to the registration portal. Use Refresh workspace to see the latest calls.</p>
      {agent?.company_url && <a href={agent.company_url} target="_blank" rel="noreferrer">Registration portal ↗</a>}
    </div></section>
    <section className="panel">
      <div className="panel-heading"><div><h2>Call history</h2><p>Caller numbers, call times and conversation transcripts.</p></div><span>{data.calls.length} recent calls</span></div>
      <div className="client-calls">
        {data.calls.length ? data.calls.map(call => <article key={call.id}>
          <div className="client-call-heading"><strong>{call.customer_phone || "Unknown caller"}</strong><Status value={call.status} /><time>{new Date(call.created_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}</time></div>
          <p className="muted">{call.agent_name}{call.duration_seconds == null ? "" : ` · ${Math.round(call.duration_seconds)} seconds`}</p>
          <details><summary>View transcript</summary><div className="transcript">{call.transcript || "A transcript is not available yet."}</div></details>
        </article>) : <div className="records-empty"><strong>No calls yet</strong><p>Calls to your demo agent will appear here, with their transcripts.</p></div>}
      </div>
    </section>
  </>;
}
