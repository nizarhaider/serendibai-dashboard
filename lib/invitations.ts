import { randomBytes } from "node:crypto";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { digest } from "./auth";
import { db } from "./db";

export async function sendInvitation(userId: string, email: string, name: string) {
  if (!process.env.SES_ACCESS_KEY_ID || !process.env.SES_SECRET_ACCESS_KEY)
    throw new Error("Email sending is not configured.");
  const token = randomBytes(32).toString("hex"), sql = db();
  await sql`insert into portal_invitations(user_id,token_hash,expires_at,sent_at) values(${userId},${digest(token)},now()+interval '7 days',null) on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,sent_at=null`;
  const client = new SESv2Client({ region: "ap-south-1", credentials: { accessKeyId: process.env.SES_ACCESS_KEY_ID, secretAccessKey: process.env.SES_SECRET_ACCESS_KEY } });
  const link = `https://portal.serendibai.lk/invite?token=${token}`;
  await client.send(new SendEmailCommand({ FromEmailAddress: "SerendibAI <onboarding@notify.serendibai.lk>", Destination: { ToAddresses: [email] }, Content: { Simple: { Subject: { Data: "Your SerendibAI invitation" }, Body: { Text: { Data: `Hi ${name},\n\nYour SerendibAI workspace is ready. Set your password using this link and continue straight to WhatsApp setup:\n\n${link}\n\nThis link expires in seven days and can be used once.\n\nSerendibAI` } } } } }));
  await sql`update portal_invitations set sent_at=now() where user_id=${userId} and token_hash=${digest(token)}`;
}
