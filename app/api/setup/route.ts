import { z } from "zod";
import { ApiError, checkOrigin, digest, hashPassword, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit(`setup:${request.headers.get("x-nf-client-connection-ip") || "local"}`, 10);
    const b = z.object({ token: z.string().min(30).max(200), email: z.email().max(250), password: z.string().min(12).max(200) }).parse(await request.json());
    const [user] = await db()`with claim as (delete from portal_setup_tokens where token_hash=${digest(b.token)} and expires_at>now() and not exists(select 1 from portal_users where is_admin) returning customer_id) insert into portal_users(customer_id,email,password_hash,is_admin,display_name) select customer_id,${b.email.toLowerCase()},${hashPassword(b.password)},true,'Administrator' from claim returning id`;
    if (!user) throw new ApiError("This setup link has expired or has already been used.", 400);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof ApiError ? e.message : "Unable to set up this account." }, { status: e instanceof ApiError ? e.status : 400 });
  }
}
