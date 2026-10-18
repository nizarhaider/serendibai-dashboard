import { timingSafeEqual } from "node:crypto";
import { demoSignature, handleDemoWebhook } from "@/lib/demo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const expected = Buffer.from(demoSignature(body));
  const supplied = Buffer.from(request.headers.get("x-demo-signature") || "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
    return new Response("Invalid signature", { status: 403 });
  await handleDemoWebhook(JSON.parse(body));
  return Response.json({ ok: true });
}
