import { randomBytes } from "node:crypto";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { z } from "zod";
import { ApiError, checkOrigin, digest, hashPassword, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";

const response = { message: "If an account uses that email, we’ll send a password reset link shortly." };

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const ip = request.headers.get("x-nf-client-connection-ip") || "local";
    await rateLimit(`password-reset:${digest(ip)}`, 10, 3600);
    const { email } = z.object({ email: z.email().max(250) }).parse(await request.json());
    const normalized = email.toLowerCase();
    const [user] = await db()`select id,display_name from portal_users where email=${normalized}`;
    if (user && process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = digest(token);
      await db()`insert into portal_invitations(user_id,token_hash,expires_at,sent_at) values(${user.id},${tokenHash},now()+interval '30 minutes',null) on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,sent_at=null`;
      const client = new SESv2Client({ region: "ap-south-1", credentials: { accessKeyId: process.env.SES_ACCESS_KEY_ID, secretAccessKey: process.env.SES_SECRET_ACCESS_KEY } });
      try {
        await client.send(new SendEmailCommand({ FromEmailAddress: "SerendibAI <onboarding@notify.serendibai.lk>", Destination: { ToAddresses: [normalized] }, Content: { Simple: { Subject: { Data: "Reset your SerendibAI password" }, Body: { Text: { Data: `Hi ${user.display_name || "there"},\n\nUse this one-time link to reset your SerendibAI password. It expires in 30 minutes:\n\nhttps://portal.serendibai.lk/forgot-password?token=${token}\n\nIf you did not request this, you can ignore this email.\n\nSerendibAI` } } } } }));
        await db()`update portal_invitations set sent_at=now() where user_id=${user.id} and token_hash=${tokenHash}`;
      } catch {
        return Response.json(response);
      }
    }
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Unable to send a reset link right now." }, { status: error instanceof ApiError ? error.status : 400 });
  }
}

export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit(`password-reset-submit:${digest(request.headers.get("x-nf-client-connection-ip") || "local")}`, 10);
    const { token, password } = z.object({ token: z.string().min(32).max(128), password: z.string().min(12).max(200) }).parse(await request.json());
    const [user] = await db()`with claim as (delete from portal_invitations where token_hash=${digest(token)} and expires_at>now() returning user_id), updated as (update portal_users set password_hash=${hashPassword(password)} where id in(select user_id from claim) returning id), revoked as (delete from portal_sessions where user_id in(select id from updated) returning user_id) select id from updated`;
    if (!user) throw new ApiError("This reset link has expired or has already been used.", 400);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Unable to reset your password." }, { status: error instanceof ApiError ? error.status : 400 });
  }
}
