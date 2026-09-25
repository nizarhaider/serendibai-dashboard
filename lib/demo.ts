import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError, digest, rateLimit } from "./auth";
import { runtimeSecrets } from "./runtime";

export const demoNumber = "94774482914";
export function normalizeDemoPhone(value: string) {
  let phone = value.trim().replace(/[\s()-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  if (/^0[1-9]\d{8}$/.test(phone)) phone = `94${phone.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(phone) || (phone.startsWith("94") && !/^94[1-9]\d{8}$/.test(phone)))
    throw new ApiError("Enter a valid WhatsApp number with its country code.");
  return phone;
}

async function agentForDemo() {
  const [agent] = await db()`select * from portal_agents where id=${process.env.DEMO_AGENT_ID || null}`;
  if (!agent || agent.status !== "ready" || !agent.heartbeat_at || Date.now() - new Date(agent.heartbeat_at).getTime() > 90000 || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(agent.telemetry?.runtime_url || ""))
    throw new ApiError("Our demo agent is offline. Please try again shortly.", 503);
  return agent;
}

async function graph(path: string, body?: object) {
  const agent = await agentForDemo();
  const env = runtimeSecrets(agent);
  const response = await fetch(`https://graph.facebook.com/v25.0/${agent.phone_number_id}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError("WhatsApp could not process this request. Please try again later.", 502);
  return result;
}

export async function createDemo(phone: string, ip: string) {
  await agentForDemo();
  await rateLimit(`demo:ip:${digest(ip)}`, 3, 86400);
  await rateLimit(`demo:phone:${digest(phone)}`, 2, 86400);
  await rateLimit("demo:global", 30, 86400);
  const id = randomBytes(16).toString("hex");
  await db()`insert into portal_demo_requests(id,phone,state,expires_at) values(${id},${phone},'confirm',now()+interval '10 minutes')`;
  try {
    const permission = await graph(`call_permissions?user_wa_id=${phone}`);
    if (permission.actions?.some((a: { action_name: string; can_perform_action: boolean }) => a.action_name === "start_call" && a.can_perform_action)) {
      await startDemo(id);
    } else if (permission.actions?.some((a: { action_name: string; can_perform_action: boolean }) => a.action_name === "send_call_permission_request" && a.can_perform_action)) {
      const result = await graph("messages", { messaging_product: "whatsapp", to: phone, type: "template", template: { name: "serendibai_demo_call", language: { code: "en" } } });
      await db()`update portal_demo_requests set state='permission',message_id=${result.messages[0].id} where id=${id}`;
    }
  } catch {
  }
  return { id, ...(await demoStatus(id)) };
}

export async function demoStatus(id: string) {
  const [row] = await db()`select state,expires_at from portal_demo_requests where id=${id}`;
  if (!row) throw new ApiError("Demo request not found.", 404);
  return { state: new Date(row.expires_at).getTime() < Date.now() && !["calling", "completed", "failed"].includes(row.state) ? "expired" : row.state, whatsappUrl: `https://wa.me/${demoNumber}?text=${encodeURIComponent(`DEMO ${id}`)}` };
}

async function startDemo(id: string) {
  const agent = await agentForDemo();
  const [row] = await db()`update portal_demo_requests set state='calling' where id=${id} and state in ('confirm','permission') and expires_at>now() returning phone`;
  if (!row) return;
  try {
    const permission = await graph(`call_permissions?user_wa_id=${row.phone}`);
    if (!permission.actions?.some((a: { action_name: string; can_perform_action: boolean }) => a.action_name === "start_call" && a.can_perform_action)) throw new Error("Permission unavailable");
    const body = JSON.stringify({ id, phone: row.phone, timestamp: Math.floor(Date.now() / 1000) });
    const signature = createHmac("sha256", runtimeSecrets(agent).VERIFY_TOKEN).update(body).digest("hex");
    const response = await fetch(`${agent.telemetry.runtime_url}/demo/call`, { method: "POST", headers: { "Content-Type": "application/json", "x-demo-signature": signature }, body, signal: AbortSignal.timeout(25000), redirect: "error" });
    if (!response.ok) throw new Error("Call unavailable");
    const result = await response.json();
    await db()`update portal_demo_requests set call_id=${result.call_id} where id=${id}`;
  } catch {
    await db()`update portal_demo_requests set state='failed' where id=${id}`;
  }
}

export async function handleDemoWebhook(body: { entry?: { changes?: { value?: Record<string, unknown> }[] }[] }) {
  for (const entry of body.entry || []) for (const change of entry.changes || []) {
    const value = change.value || {};
    for (const message of (value.messages || []) as { from?: string; text?: { body?: string }; context?: { id?: string }; interactive?: { type?: string; call_permission_reply?: { response?: string; response_source?: string } } }[]) {
      if (!message.from) continue;
      const reply = message.interactive?.call_permission_reply;
      if (message.interactive?.type === "call_permission_reply" && reply?.response_source === "user_action" && message.context?.id) {
        const [row] = await db()`select id from portal_demo_requests where phone=${message.from} and message_id=${message.context.id} and state='permission' and expires_at>now()`;
        if (row && reply.response === "accept") await startDemo(row.id);
        else if (row && reply.response === "reject") await db()`update portal_demo_requests set state='declined' where id=${row.id}`;
      }
      const id = /^DEMO ([a-f0-9]{32})$/i.exec(message.text?.body?.trim() || "")?.[1]?.toLowerCase();
      if (!id) continue;
      const [row] = await db()`select id from portal_demo_requests where id=${id} and phone=${message.from} and state in ('confirm','permission') and expires_at>now()`;
      if (!row) continue;
      const permission = await graph(`call_permissions?user_wa_id=${message.from}`);
      if (permission.actions?.some((a: { action_name: string; can_perform_action: boolean }) => a.action_name === "start_call" && a.can_perform_action)) await startDemo(id);
      else {
        const [claimed] = await db()`update portal_demo_requests set state='requesting' where id=${id} and state='confirm' returning id`;
        if (!claimed) continue;
        try {
          const result = await graph("messages", { messaging_product: "whatsapp", to: message.from, type: "interactive", interactive: { type: "call_permission_request", action: { name: "call_permission_request" }, body: { text: "Allow a three-minute SerendibAI demo call. You will speak with an AI assistant; this demo may be recorded and transcribed." } } });
          await db()`update portal_demo_requests set state='permission',message_id=${result.messages[0].id} where id=${id}`;
        } catch { await db()`update portal_demo_requests set state='failed' where id=${id}`; }
      }
    }
    for (const status of (value.statuses || []) as { id: string; status: string }[]) {
      if (status.status === "failed") await db()`update portal_demo_requests set state='confirm' where message_id=${status.id} and state='permission'`;
      if (status.status === "REJECTED") await db()`update portal_demo_requests set state='declined' where call_id=${status.id}`;
    }
    for (const call of (value.calls || []) as { id: string; event: string; status?: string; biz_opaque_callback_data?: string }[]) {
      if (call.event === "terminate") await db()`update portal_demo_requests set state=${call.status === "FAILED" ? "failed" : "completed"} where call_id=${call.id} or id=${call.biz_opaque_callback_data || ""}`;
    }
  }
}
