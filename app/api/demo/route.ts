import { z } from "zod";
import { ApiError } from "@/lib/auth";
import { createDemo, demoStatus, normalizeDemoPhone } from "@/lib/demo";

export const runtime = "nodejs";
const input = z.object({ phone: z.string().max(30), consent: z.literal(true), company: z.literal("") });
const origins = ["https://serendibai.lk", "https://www.serendibai.lk", ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3200"] : [])];
async function handler(request: Request) {
  const origin = request.headers.get("origin") || "";
  const headers = { "Access-Control-Allow-Origin": origins.includes(origin) ? origin : "https://serendibai.lk", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store", Vary: "Origin" };
  if (!origins.includes(origin)) return Response.json({ error: "Request origin rejected." }, { status: 403, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    if (request.method === "GET") {
      const id = z.string().regex(/^[a-f0-9]{32}$/).parse(new URL(request.url).searchParams.get("id"));
      return Response.json(await demoStatus(id), { headers });
    }
    const text = await request.text();
    if (text.length > 1000) throw new ApiError("Request too large.", 413);
    const body = input.parse(JSON.parse(text));
    const result = await createDemo(normalizeDemoPhone(body.phone), request.headers.get("x-nf-client-connection-ip") || "unknown");
    return Response.json(result, { status: 201, headers });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Please check your number and try again." }, { status: error instanceof ApiError ? error.status : 400, headers });
  }
}
export { handler as GET, handler as POST, handler as OPTIONS };
