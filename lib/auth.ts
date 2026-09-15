import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function session() {
  const token = (await cookies()).get("portal_session")?.value;
  if (!token) return null;
  const [user] =
    await db()`select u.id,u.email,u.customer_id from portal_sessions s join portal_users u on u.id=s.user_id where s.token_hash=${digest(token)} and s.expires_at>now()`;
  return user as { id: string; email: string; customer_id: string } | undefined;
}
export async function requireUser() {
  const user = await session();
  if (!user) throw new ApiError("Please sign in to continue.", 401);
  return user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError("Request origin rejected.", 403);
}
export async function rateLimit(key: string, limit: number, seconds = 900) {
  const [row] =
    await db()`insert into portal_rate_limits(key,expires_at) values(${key},now()+${seconds}*interval '1 second') on conflict(key) do update set attempts=case when portal_rate_limits.expires_at<now() then 1 else portal_rate_limits.attempts+1 end, expires_at=case when portal_rate_limits.expires_at<now() then excluded.expires_at else portal_rate_limits.expires_at end returning attempts`;
  if (row.attempts > limit)
    throw new ApiError("Too many requests. Please try again later.", 429);
}
export async function login(email: string, password: string, ip: string) {
  await rateLimit(`login:${digest(ip)}`, 10);
  const [user] =
    await db()`select * from portal_users where email=${email.toLowerCase()}`;
  const [salt, expected] = (user?.password_hash || "invalid:00").split(":");
  const supplied = scryptSync(password, salt, 64);
  const stored = Buffer.from(expected, "hex");
  if (
    !user ||
    stored.length !== supplied.length ||
    !timingSafeEqual(supplied, stored)
  )
    throw new ApiError("Email or password is incorrect.", 401);
  const token = randomBytes(32).toString("hex");
  await db()`insert into portal_sessions(token_hash,user_id,expires_at) values(${digest(token)},${user.id},now()+interval '12 hours')`;
  (await cookies()).set("portal_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
function encryptionKey() {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret) throw new Error("Encryption key is not configured.");
  return createHash("sha256").update(secret).digest();
}
export function encrypt(value: object) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((x) => x.toString("base64"))
    .join(".");
}
export function decrypt(value: string | null): Record<string, string> {
  if (!value) return {};
  const [iv, tag, data] = value.split(".").map((x) => Buffer.from(x, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString(),
  );
}
