import Link from "next/link";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await session();
  if (!user) redirect("/login");
  if (!user.is_admin) redirect("/dashboard");
  const calls = await db()`select p.id,p.transcript,p.status,p.duration_seconds,p.created_at,c.title
    from portal_calls p join portal_agent_cases c on c.agent_id=p.agent_id
    where p.customer_id=(select customer_id from portal_agents where id=c.agent_id)
    order by p.created_at desc limit 100`;
  return <main className="case-studio">
    <Link className="case-brand" href="/cases">SerendibAI Demo Studio</Link>
    <h1>Case transcripts.</h1>
    <p className="case-intro">The latest 100 demo calls. Recordings remain private until a showcase clip is selected.</p>
    {!calls.length && <p>No case calls yet. <Link href="/cases">Record your first demo</Link>.</p>}
    {calls.map((call) => <details key={call.id} className="case-transcript">
      <summary>{call.title} · {new Date(call.created_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} · {call.status}{call.duration_seconds ? ` · ${Math.round(call.duration_seconds)}s` : ""}</summary>
      <pre>{call.transcript || "The transcript will appear as the conversation starts. Refresh to update."}</pre>
    </details>)}
    <p className="case-note"><Link href="/dashboard">Back to dashboard</Link></p>
  </main>;
}
