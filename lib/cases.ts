import { createHmac, randomBytes } from "node:crypto";
import { ApiError, digest, rateLimit } from "./auth";
import { db } from "./db";
import { validRuntimeUrl } from "./runtime";

export function normalizePhone(value: string) {
  let phone = value.trim().replace(/[\s()-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  if (/^0[1-9]\d{8}$/.test(phone)) phone = `94${phone.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(phone) || (phone.startsWith("94") && !/^94[1-9]\d{8}$/.test(phone)))
    throw new ApiError("Enter a valid WhatsApp number with its country code.");
  return phone;
}

export function caseSignature(body: string) {
  const secret = process.env.DEMO_SIGNING_SECRET;
  if (!secret) throw new ApiError("Demo calling is not configured.", 503);
  return createHmac("sha256", secret).update(body).digest("hex");
}

export const caseSlugs = ["sales"] as const;
export type AgentCase = { slug: string; title: string; company_name: string; description: string; caller_hint: string; available: boolean };

export async function getCases() {
  const rows = await db()`select c.slug,c.title,a.company_name,c.description,c.caller_hint,
    (r.status='ready' and r.heartbeat_at>now()-interval '90 seconds' and r.telemetry->>'case_callbacks'='true') as available
    from portal_agent_cases c join portal_agents r on r.id=c.runtime_agent_id join portal_agents a on a.id=c.agent_id
    where c.slug='sales'`;
  return rows as AgentCase[];
}

export async function registerCase(value: string, slug: string, ip: string) {
  const phone = normalizePhone(value);
  await rateLimit(`case:ip:${digest(ip)}`, 15, 3600);
  await rateLimit(`case:phone:${digest(phone)}`, 10, 3600);
  await rateLimit("case:global", 100, 86400);
  const [target] = await db()`select c.runtime_agent_id,r.telemetry->>'runtime_url' as runtime_url from portal_agent_cases c
    join portal_agents r on r.id=c.runtime_agent_id join portal_agents a on a.id=c.agent_id
    where c.slug=${slug} and a.status<>'archived' and r.status='ready'
      and r.heartbeat_at>now()-interval '90 seconds' and r.telemetry->>'case_callbacks'='true'`;
  if (!target || !validRuntimeUrl(target.runtime_url || "")) throw new ApiError("The demo agents are offline. Please try again shortly.", 503);
  const id = randomBytes(16).toString("hex");
  const [created] = await db()`insert into portal_case_requests(id,phone,case_slug,runtime_agent_id,direction)
    values(${id},${phone},${slug},${target.runtime_agent_id},'outbound')
    on conflict(runtime_agent_id,phone) do update set id=excluded.id,case_slug=excluded.case_slug,
      direction='outbound',state='pending',call_id=null,message_id=null,error='',expires_at=now()+interval '10 minutes',created_at=now()
    where portal_case_requests.state not in ('preparing','permission','calling') or portal_case_requests.expires_at<now()
    returning id`;
  if (!created) throw new ApiError("A demo is already in progress for this number. Finish it or wait for it to expire.", 409);
  const body = JSON.stringify({ id, phone, timestamp: Math.floor(Date.now() / 1000) });
  try {
    const response = await fetch(`${target.runtime_url}/cases/call`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-demo-signature": caseSignature(body) },
      body, signal: AbortSignal.timeout(25000), redirect: "error",
    });
    if (!response.ok) throw new Error("Callback unavailable");
  } catch {
    await db()`update portal_case_requests set state='failed',error='We could not start your callback. Please try again shortly.' where id=${id} and state='pending'`;
  }
  return { id, ...(await caseStatus(id)) };
}

export async function caseStatus(id: string) {
  const [row] = await db()`select q.state,q.expires_at,q.error,c.title,c.caller_hint
    from portal_case_requests q join portal_agent_cases c on c.slug=q.case_slug
    join portal_agents r on r.id=q.runtime_agent_id where q.id=${id}`;
  if (!row) throw new ApiError("Case selection not found. Please select your case again.", 404);
  return {
    state: new Date(row.expires_at).getTime() < Date.now() && !["consumed", "completed", "failed", "declined"].includes(row.state) ? "expired" : row.state,
    title: row.title, callerHint: row.caller_hint, expiresAt: row.expires_at,
    error: row.error,
  };
}
