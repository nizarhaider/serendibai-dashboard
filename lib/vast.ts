import { randomBytes } from "node:crypto";
import { db, audit } from "./db";
import { ApiError, digest, decrypt, rateLimit } from "./auth";

export async function vast(path: string, method = "GET", body?: object) {
  if (!process.env.VASTAI_API_KEY)
    throw new ApiError("Vast.ai is not connected.", 503);
  const response = await fetch(`https://console.vast.ai/api/v0/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.VASTAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(
      `Vast.ai returned ${response.status}. Please retry.`,
      502,
    );
  const result = await response.json();
  if (result.success === false)
    throw new ApiError(
      "Vast.ai could not complete this operation. The offer may no longer be available.",
      409,
    );
  return result;
}
export async function offers(budget = 0.2) {
  const result = await vast("bundles/", "POST", {
    verified: { eq: true },
    rentable: { eq: true },
    rented: { eq: false },
    num_gpus: { eq: 1 },
    cpu_cores_effective: { gte: 2 },
    cpu_arch: { eq: "amd64" },
    gpu_ram: { gte: 8000 },
    disk_space: { gte: 20 },
    inet_down: { gte: 100 },
    reliability: { gte: 0.98 },
    dph_total: { lte: budget },
    type: "ondemand",
    order: [["dph_total", "asc"]],
    limit: 8,
  });
  return (result.offers || []).map((o: Record<string, number | string>) => ({
    id: o.id,
    gpu: o.gpu_name,
    vram: Number(o.gpu_ram) / 1000,
    cpu: o.cpu_cores_effective,
    ram: Number(o.cpu_ram) / 1000,
    hourly: Number(o.dph_total),
    reliability: Number(o.reliability),
    location: o.geolocation,
  }));
}
export async function compute(customer: string) {
  const own =
    await db()`select id,instance_id from portal_agents where customer_id=${customer} and instance_id is not null`;
  const result = await vast("instances/");
  return (result.instances || [])
    .filter((i: { id: number }) =>
      own.some((a) => Number(a.instance_id) === i.id),
    )
    .map((i: Record<string, unknown>) => ({
      id: i.id,
      status: i.actual_status,
      gpu: i.gpu_name,
      gpu_util: i.gpu_util,
      cpu_util: i.cpu_util,
      ram: i.cpu_ram,
      mem_usage: i.mem_usage,
      price: i.dph_total,
      disk: i.disk_usage,
      uptime: i.duration,
      location: i.geolocation,
    }));
}
export async function agentAction(
  customer: string,
  id: string,
  action: string,
  offerId?: number,
) {
  const sql = db();
  const [agent] =
    await sql`update portal_agents set operation_at=now() where id=${id} and customer_id=${customer} and (operation_at is null or operation_at<now()-interval '2 minutes') returning *`;
  if (!agent)
    throw new ApiError(
      "Another operation is in progress, or the agent does not exist.",
      409,
    );
  try {
    if (action === "deploy") {
      await rateLimit(`provision:${customer}`, 1, 30);
      if (agent.phone_number_id) {
        const [connected] =
          await sql`select id from portal_agents where phone_number_id=${agent.phone_number_id} and instance_id is not null and id<>${id}`;
        if (connected)
          throw new ApiError(
            "This phone number already has deployed compute. Destroy its other instance first.",
            409,
          );
      }
      if (agent.instance_id)
        throw new ApiError(
          "This agent already has compute. Start or destroy the existing instance first.",
        );
      if (!agent.system_prompt.trim())
        throw new ApiError("Save a system prompt before deploying.");
      const available = await offers(Number(agent.hourly_budget));
      const offer = available.find((o: { id: number }) => o.id === offerId);
      if (!offer)
        throw new ApiError(
          "Offer expired or exceeds your budget. Refresh compute offers.",
          409,
        );
      const token = randomBytes(32).toString("hex");
      await sql`update portal_agents set runtime_token_hash=${digest(token)},status='provisioning',telemetry='{}' where id=${id}`;
      const portal = process.env.PORTAL_URL || "https://portal.serendibai.lk";
      const result = await vast(`asks/${offer.id}/`, "PUT", {
        client_id: "me",
        image: "python:3.12-slim-bookworm",
        disk: 20,
        runtype: "ssh",
        label: `serendibai-portal-${id}`,
        env: {
          PORTAL_URL: portal,
          PORTAL_AGENT_ID: id,
          PORTAL_RUNTIME_TOKEN: token,
        },
        onstart:
          "apt-get update -qq && apt-get install -y -qq git curl ffmpeg libglib2.0-0 && (test -d /workspace/voice-agent/.git || git clone https://github.com/nizarhaider/sl-chatbot.git /workspace/voice-agent) && cd /workspace/voice-agent && git pull --ff-only && bash scripts/portal_start.sh",
        cancel_unavail: true,
      });
      if (!result.new_contract)
        throw new ApiError("Vast.ai did not return an instance ID.", 502);
      await sql`update portal_agents set instance_id=${result.new_contract},status='provisioning' where id=${id}`;
      await audit(
        customer,
        "Compute provisioned",
        `${agent.name} · ${offer.gpu} · $${offer.hourly.toFixed(3)}/hour`,
        id,
      );
    } else if (action === "restart") {
      if (
        !agent.instance_id ||
        !agent.heartbeat_at ||
        Date.now() - new Date(agent.heartbeat_at).getTime() > 120000
      )
        throw new ApiError(
          "The runtime must be online to restart. Start its compute first.",
        );
      await sql`update portal_agents set deployed_version=-1,status='restarting' where id=${id}`;
      await audit(
        customer,
        "Restart requested",
        `${agent.name} will restart on its next heartbeat. Active calls will disconnect.`,
        id,
      );
    } else {
      if (!agent.instance_id)
        throw new ApiError("This agent has no compute instance.");
      if (action === "destroy") {
        await vast(`instances/${agent.instance_id}/`, "DELETE");
        await sql`update portal_agents set instance_id=null,runtime_token_hash=null,status='draft',heartbeat_at=null,telemetry='{}' where id=${id}`;
      } else if (action === "start" || action === "stop") {
        await vast(`instances/${agent.instance_id}/`, "PUT", {
          state: action === "start" ? "running" : "stopped",
        });
        await sql`update portal_agents set status=${action === "start" ? "starting" : "stopped"},heartbeat_at=null where id=${id}`;
      } else throw new ApiError("Unknown compute action.");
      await audit(customer, `Compute ${action}`, agent.name, id);
    }
    return { ok: true };
  } catch (error) {
    if (action === "deploy") {
      const result = await vast("instances/").catch(() => null);
      const existing = result?.instances?.find(
        (instance: { label: string }) =>
          instance.label === `serendibai-portal-${id}`,
      );
      if (existing) {
        await sql`update portal_agents set instance_id=${existing.id},status='provisioning' where id=${id}`;
      } else if (result) {
        await sql`update portal_agents set status='draft',runtime_token_hash=null where id=${id} and instance_id is null`;
      }
    }
    throw error;
  } finally {
    await sql`update portal_agents set operation_at=null where id=${id}`;
  }
}
export function runtimeSecrets(agent: Record<string, unknown>) {
  const custom = decrypt(agent.credentials as string | null);
  const legacy = agent.phone_number_id === process.env.PHONE_NUMBER_ID;
  return {
    GEMINI_API_KEY: custom.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
    PHONE_NUMBER_ID: agent.phone_number_id || "",
    WHATSAPP_ACCESS_TOKEN:
      custom.WHATSAPP_ACCESS_TOKEN ||
      (legacy ? process.env.WHATSAPP_ACCESS_TOKEN : "") ||
      "",
    VERIFY_TOKEN: custom.VERIFY_TOKEN || process.env.VERIFY_TOKEN || "",
    WHATSAPP_APP_SECRET: custom.WHATSAPP_APP_SECRET || "",
    ...(legacy
      ? { CLOUDFLARED_TUNNEL_TOKEN: process.env.CLOUDFLARED_TUNNEL_TOKEN || "" }
      : {}),
  };
}
