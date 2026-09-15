import { neon } from "@neondatabase/serverless";

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  return neon(process.env.DATABASE_URL);
}

export async function audit(
  customer: string,
  action: string,
  detail: string,
  agent?: string,
) {
  await db()`insert into portal_events(customer_id,agent_id,action,detail) values(${customer},${agent || null},${action},${detail})`;
}
