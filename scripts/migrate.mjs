import { readFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
for (const statement of (
  await readFile(new URL("../db/schema.sql", import.meta.url), "utf8")
)
  .split(";")
  .filter((x) => x.trim()))
  await sql.query(statement);
const customer = "908153ff-146c-418f-b8ca-2c88ba314c44";
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(process.env.ADMIN_PASSWORD || "admin", salt, 64).toString("hex")}`;
await sql`insert into portal_users(email,password_hash,customer_id) values('admin@gmail.com',${hash},${customer}) on conflict(email) do nothing`;
await sql`insert into portal_quotas(customer_id) values(${customer}) on conflict do nothing`;
console.log(
  "Portal schema ready.",
);
