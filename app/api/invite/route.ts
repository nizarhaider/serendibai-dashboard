import { z } from "zod";
import { ApiError, checkOrigin, digest, hashPassword, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit(`invite:${request.headers.get("x-nf-client-connection-ip") || "local"}`, 10);
    const body = z.object({ token: z.string().min(32).max(128), password: z.string().min(12).max(200) }).parse(await request.json());
    const [user] = await db()`with claim as (delete from portal_invitations where token_hash=${digest(body.token)} and expires_at>now() returning user_id), updated as (update portal_users set password_hash=${hashPassword(body.password)} where id in (select user_id from claim) returning id) select id from updated`;
    if (!user) throw new ApiError("This invitation has expired or has already been used.", 400);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Unable to set your password." }, { status: error instanceof ApiError ? error.status : 400 });
  }
}
