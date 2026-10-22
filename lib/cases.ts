import { randomBytes } from "node:crypto";
import { ApiError, digest, rateLimit } from "./auth";
import { db } from "./db";
import { normalizeDemoPhone } from "./demo";

export const caseSlugs = ["support", "sales", "operations", "marketing", "talent"] as const;
export type AgentCase = { slug: string; title: string; description: string; caller_hint: string; available: boolean };

export async function getCases() {
  const rows = await db()`select c.slug,c.title,c.description,c.caller_hint,
    (r.status='ready' and r.heartbeat_at>now()-interval '90 seconds' and r.telemetry->>'case_routing'='true') as available
    from portal_agent_cases c join portal_agents r on r.id=c.runtime_agent_id
    order by array_position(array['support','sales','operations','marketing','talent'],c.slug)`;
  return rows as AgentCase[];
}

export async function registerCase(value: string, slug: string, ip: string) {
  const phone = normalizeDemoPhone(value);
  await rateLimit(`case:ip:${digest(ip)}`, 30, 3600);
  await rateLimit(`case:phone:${digest(phone)}`, 20, 3600);
  const [target] = await db()`select c.runtime_agent_id from portal_agent_cases c
    join portal_agents r on r.id=c.runtime_agent_id join portal_agents a on a.id=c.agent_id
    where c.slug=${slug} and a.status<>'archived' and r.status='ready'
      and r.heartbeat_at>now()-interval '90 seconds' and r.telemetry->>'case_routing'='true'`;
  if (!target) throw new ApiError("The demo agents are offline. Please try again shortly.", 503);
  const id = randomBytes(16).toString("hex");
  await db()`insert into portal_case_requests(id,phone,case_slug,runtime_agent_id)
    values(${id},${phone},${slug},${target.runtime_agent_id})
    on conflict(runtime_agent_id,phone) do update set id=excluded.id,case_slug=excluded.case_slug,
      state='pending',call_id=null,expires_at=now()+interval '10 minutes',created_at=now()`;
  return { id, ...(await caseStatus(id)) };
}

export async function caseStatus(id: string) {
  const [row] = await db()`select q.state,q.expires_at,c.title,c.caller_hint,
    c.whatsapp_number as number
    from portal_case_requests q join portal_agent_cases c on c.slug=q.case_slug
    join portal_agents r on r.id=q.runtime_agent_id where q.id=${id}`;
  if (!row) throw new ApiError("Case selection not found. Please select your case again.", 404);
  return {
    state: new Date(row.expires_at).getTime() < Date.now() && row.state !== "consumed" ? "expired" : row.state,
    title: row.title, callerHint: row.caller_hint, expiresAt: row.expires_at,
    whatsappUrl: row.number ? `https://wa.me/${row.number}?text=${encodeURIComponent(`CASE ${id}`)}` : null,
  };
}
