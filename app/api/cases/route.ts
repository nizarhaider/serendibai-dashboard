import { z } from "zod";
import { ApiError, checkOrigin } from "@/lib/auth";
import { caseSlugs, caseStatus, getCases, registerCase } from "@/lib/cases";

export const runtime = "nodejs";
const input = z.object({ phone: z.string().max(30), case: z.enum(caseSlugs), consent: z.literal(true), company: z.literal("") });
const headers = { "Cache-Control": "no-store" };

async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id");
      return Response.json(id ? await caseStatus(z.string().regex(/^[a-f0-9]{32}$/).parse(id)) : await getCases(), { headers });
    }
    checkOrigin(request);
    const text = await request.text();
    if (text.length > 1000) throw new ApiError("Request too large.", 413);
    const body = input.parse(JSON.parse(text));
    const result = await registerCase(body.phone, body.case, request.headers.get("x-nf-client-connection-ip") || "unknown");
    return Response.json(result, { status: 201, headers });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Please check your selection and try again." }, { status: error instanceof ApiError ? error.status : 400, headers });
  }
}

export { handler as GET, handler as POST };
