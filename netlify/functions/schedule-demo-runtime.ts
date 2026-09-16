import { neon } from "@neondatabase/serverless";

declare const Netlify: { env: { get: (name: string) => string | undefined } };

const scheduleDemoRuntime = async () => {
  const databaseUrl = Netlify.env.get("DATABASE_URL");
  const apiKey = Netlify.env.get("VASTAI_API_KEY");
  const agentId = Netlify.env.get("DEMO_AGENT_ID");
  if (!databaseUrl || !apiKey || !agentId) throw new Error("Runtime schedule is not configured.");
  const sql = neon(databaseUrl);
  const [agent] = await sql`select id,customer_id,name,instance_id from portal_agents where id=${agentId}`;
  if (!agent?.instance_id) return new Response("No demo instance.", { status: 200 });
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const state = hour >= 8 ? "running" : "stopped";
  const response = await fetch(`https://console.vast.ai/api/v0/instances/${agent.instance_id}/`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(`Vast.ai returned ${response.status}.`);
  await sql`update portal_agents set status=${state === "running" ? "starting" : "stopped"},heartbeat_at=null where id=${agent.id}`;
  await sql`insert into portal_events(customer_id,agent_id,action,detail) values(${agent.customer_id},${agent.id},${state === "running" ? "Compute started by schedule" : "Compute stopped by schedule"},${`${agent.name} · Asia/Colombo`})`;
  return new Response(state, { status: 200 });
};

export default scheduleDemoRuntime;

export const config = { schedule: "30 2,18 * * *" };
