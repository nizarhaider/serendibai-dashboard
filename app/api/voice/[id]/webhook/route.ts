import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { runtimeSecrets } from "@/lib/vast";
import { handleDemoWebhook } from "@/lib/demo";
import { z } from "zod";

export const runtime = "nodejs";
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const [agent] = await db()`select * from portal_agents where id=${id}`;
  if (!agent) return new Response("Not found", { status: 404 });
  const env = runtimeSecrets(agent),
    url = new URL(request.url);
  if (request.method === "GET")
    return url.searchParams.get("hub.mode") === "subscribe" &&
      env.VERIFY_TOKEN &&
      url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN
      ? new Response(url.searchParams.get("hub.challenge"))
      : new Response("Verification failed", { status: 403 });
  const body = await request.text(),
    expected = Buffer.from(
      `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(body).digest("hex")}`,
    ),
    supplied = Buffer.from(request.headers.get("x-hub-signature-256") || "");
  if (env.WHATSAPP_APP_SECRET) {
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return new Response("Invalid signature", { status: 403 });
  }
  const payload = JSON.parse(body);
  if (
    payload.object !== "whatsapp_business_account" ||
    (id === process.env.DEMO_AGENT_ID &&
      !payload.entry?.every((entry: { id?: string }) => entry.id === "2397798740726496"))
  )
    return new Response("Invalid webhook", { status: 400 });
  if (id === process.env.DEMO_AGENT_ID) await handleDemoWebhook(payload);
  const target = agent.telemetry?.runtime_url;
  if (
    !target ||
    !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(target) ||
    !agent.heartbeat_at ||
    Date.now() - new Date(agent.heartbeat_at).getTime() > 90000
  )
    return new Response("Agent is offline", { status: 503 });
  const response = await fetch(`${target}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": request.headers.get("x-hub-signature-256") || "",
    },
    body,
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  return new Response(await response.text(), { status: response.status });
}
export { handler as GET, handler as POST };
