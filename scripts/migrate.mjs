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
await sql`insert into portal_agents(id,customer_id,name,system_prompt,phone_number_id,greeting) select id,customer_id,name,instructions,${process.env.PHONE_NUMBER_ID || ""},'To speak in English, say English. සිංහලෙන් කතා කිරීමට සිංහල කියන්න. தமிழில் பேச தமிழ் என்று சொல்லுங்கள்.' from agent_profiles where customer_id=${customer} on conflict(id) do nothing`;
await sql`insert into portal_calls(id,customer_id,agent_id,customer_phone,status,transcript,recording_url,created_at,source) select id::text,customer_id,'3d0c85a6-a3ec-4b91-8ad9-e4ac7cfb3ff0',customer_phone,status,transcript,recording_url,created_at,'historical' from calls where customer_id=${customer} on conflict(id) do nothing`;
await sql`insert into portal_documents(id,customer_id,name,content,bytes,type,created_at) select id,customer_id,filename,content,octet_length(content),'text/plain',created_at from knowledge_documents where customer_id=${customer} on conflict(id) do nothing`;
await sql`insert into portal_products(id,customer_id,name,description,price,stock,status) select id,customer_id,name,coalesce(description,''),price,stock,case when status='active' then 'active' else 'draft' end from client_catalog where customer_id=${customer} on conflict(id) do nothing`;
console.log(
  "Schema ready. Admin, existing agent, knowledge, catalogue and real call history migrated.",
);
