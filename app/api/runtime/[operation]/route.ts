import { z } from "zod";
import { db } from "@/lib/db";
import { digest, ApiError } from "@/lib/auth";
import { runtimeSecrets } from "@/lib/runtime";

export const runtime = "nodejs";
async function handler(
  request: Request,
  { params }: { params: Promise<{ operation: string }> },
) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) throw new ApiError("Unauthorized", 401);
    const sql = db(),
      [agent] =
        await sql`select * from portal_agents where runtime_token_hash=${digest(token)}`;
    if (!agent) throw new ApiError("Unauthorized", 401);
    const { operation } = await params;
    if (operation === "config" && request.method === "GET")
      return Response.json(
        {
          id: agent.id,
          name: agent.name,
          instructions: agent.system_prompt,
          greeting: agent.greeting,
          voice: agent.voice,
          languages: agent.languages,
          enabled_tools: agent.tools,
          max_calls: agent.max_calls,
          version: agent.version,
          env: runtimeSecrets(agent),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    const body = await request.json();
    if (operation === "heartbeat") {
      const b = z
        .object({
          version: z.number().int(),
          active_calls: z.number().int().nonnegative(),
          cpu_percent: z.number().min(0).max(100),
          memory_mb: z.number().nonnegative(),
          status: z.enum(["ready", "warming_up", "error"]),
          error: z.string().max(300).default(""),
          runtime_url: z.string().max(300).default(""),
        })
        .parse(body);
      if (
        b.runtime_url &&
        !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(b.runtime_url)
      )
        throw new ApiError("Invalid runtime URL.");
      const restart = agent.deployed_version === -1;
      await sql`update portal_agents set heartbeat_at=now(),telemetry=${JSON.stringify(b)}::jsonb,status=${restart ? "restarting" : b.status},deployed_version=${b.version} where id=${agent.id}`;
      return Response.json({ ok: true, restart, max_calls: agent.max_calls });
    }
    if (operation === "search") {
      const b = z
        .object({
          tool: z.enum(["search_knowledge", "search_products"]),
          query: z.string().max(500),
        })
        .parse(body);
      if (!agent.tools.includes(b.tool))
        throw new ApiError("This tool is disabled.", 403);
      const terms = b.query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 12)
        .join(" OR ");
      const results =
        b.tool === "search_knowledge"
          ? await sql`select id,name,left(content,18000) as content from portal_documents where customer_id=${agent.customer_id} and (to_tsvector('simple',content) @@ websearch_to_tsquery('simple',${terms}) or name ilike ${"%" + b.query.replace(/[%_]/g, "") + "%"}) order by ts_rank(to_tsvector('simple',content),websearch_to_tsquery('simple',${terms})) desc limit 5`
          : await sql`select name,sku,description,category,price,currency,stock,status from portal_products where customer_id=${agent.customer_id} and status='active' and (to_tsvector('simple',name || ' ' || description || ' ' || category || ' ' || sku) @@ websearch_to_tsquery('simple',${terms}) or name ilike ${"%" + b.query.replace(/[%_]/g, "") + "%"}) limit 15`;
      return Response.json({ ok: true, results });
    }
    if (operation === "appointments") {
      if (!agent.tools.includes("book_appointment"))
        throw new ApiError("This tool is disabled.", 403);
      const b = z
        .object({
          call_id: z.string().min(1).max(250),
          customer_phone: z.string().max(50).default(""),
          customer_name: z.string().trim().min(1).max(150),
          service: z.string().trim().min(1).max(200),
          appointment_at: z.iso.datetime({ offset: true }),
          duration_minutes: z.number().int().min(15).max(240).default(30),
          notes: z.string().max(2000).default(""),
        })
        .parse(body);
      const appointmentAt = new Date(b.appointment_at);
      if (appointmentAt <= new Date() || appointmentAt > new Date(Date.now() + 2 * 365 * 86400000))
        throw new ApiError("Choose a future appointment within two years.");
      const rows = await sql`insert into portal_appointments(customer_id,agent_id,call_id,customer_phone,customer_name,service,appointment_at,duration_minutes,notes) values(${agent.customer_id},${agent.id},${b.call_id},${b.customer_phone},${b.customer_name},${b.service},${appointmentAt.toISOString()},${b.duration_minutes},${b.notes}) on conflict(agent_id,appointment_at) where status='booked' do nothing returning id,customer_name,service,appointment_at,duration_minutes,status`;
      if (!rows[0]) throw new ApiError("That time is already booked. Please choose another time.", 409);
      await sql`insert into portal_events(customer_id,agent_id,action,detail) values(${agent.customer_id},${agent.id},'appointment.booked',${`${b.customer_name} · ${b.service}`})`;
      return Response.json({ ok: true, appointment: rows[0] });
    }
    if (operation === "orders") {
      if (!agent.tools.includes("create_order"))
        throw new ApiError("This tool is disabled.", 403);
      const b = z
        .object({
          call_id: z.string().min(1).max(250),
          customer_phone: z.string().max(50).default(""),
          customer_name: z.string().trim().min(1).max(150),
          items: z.array(z.object({ name: z.string().trim().min(1).max(200), quantity: z.number().int().min(1).max(999) })).min(1).max(50),
          delivery_address: z.string().max(1000).default(""),
          notes: z.string().max(2000).default(""),
        })
        .parse(body);
      const rows = await sql`insert into portal_orders(customer_id,agent_id,call_id,customer_phone,customer_name,items,delivery_address,notes) values(${agent.customer_id},${agent.id},${b.call_id},${b.customer_phone},${b.customer_name},${JSON.stringify(b.items)}::jsonb,${b.delivery_address},${b.notes}) on conflict(customer_id,call_id) do update set customer_phone=excluded.customer_phone,customer_name=excluded.customer_name,items=excluded.items,delivery_address=excluded.delivery_address,notes=excluded.notes,updated_at=now() returning id,customer_name,items,status`;
      await sql`insert into portal_events(customer_id,agent_id,action,detail) values(${agent.customer_id},${agent.id},'order.placed',${`${b.customer_name} · ${b.items.length} item${b.items.length === 1 ? "" : "s"}`})`;
      return Response.json({ ok: true, order: rows[0] });
    }
    if (operation === "tickets") {
      if (!agent.tools.includes("create_ticket"))
        throw new ApiError("This tool is disabled.", 403);
      const b = z
        .object({
          call_id: z.string().min(1).max(250),
          customer_phone: z.string().max(50).default(""),
          customer_name: z.string().trim().min(1).max(150),
          subject: z.string().trim().min(1).max(200),
          description: z.string().trim().min(1).max(5000),
          priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        })
        .parse(body);
      const rows = await sql`insert into portal_tickets(customer_id,agent_id,call_id,customer_phone,customer_name,subject,description,priority) values(${agent.customer_id},${agent.id},${b.call_id},${b.customer_phone},${b.customer_name},${b.subject},${b.description},${b.priority}) on conflict(customer_id,call_id) do update set customer_phone=excluded.customer_phone,customer_name=excluded.customer_name,subject=excluded.subject,description=excluded.description,priority=excluded.priority,updated_at=now() returning id,customer_name,subject,priority,status`;
      await sql`insert into portal_events(customer_id,agent_id,action,detail) values(${agent.customer_id},${agent.id},'ticket.created',${`${b.customer_name} · ${b.subject}`})`;
      return Response.json({ ok: true, ticket: rows[0] });
    }
    if (operation === "calls") {
      const b = z
        .object({
          id: z.string().min(1).max(250),
          customer_phone: z.string().max(50),
          status: z.enum([
            "connecting",
            "active",
            "ended",
            "completed",
            "error",
          ]),
          transcript: z.string().max(200000),
          duration_seconds: z.number().nonnegative().max(86400).nullable(),
          tokens: z.number().int().nonnegative().max(10000000).nullable(),
          usage: z.record(z.string(), z.unknown()).nullable().optional(),
          started_at: z.number().positive(),
        })
        .parse(body);
      const callId = `${agent.id}:${b.id}`;
      await sql`insert into portal_calls(id,customer_id,agent_id,customer_phone,status,transcript,duration_seconds,tokens,usage,created_at) values(${callId},${agent.customer_id},${agent.id},${b.customer_phone},${b.status},${b.transcript},${b.duration_seconds},${b.tokens},${b.usage == null ? null : JSON.stringify(b.usage)}::jsonb,to_timestamp(${b.started_at})) on conflict(id) do update set status=excluded.status,transcript=excluded.transcript,duration_seconds=excluded.duration_seconds,tokens=excluded.tokens,usage=excluded.usage,updated_at=now() where portal_calls.customer_id=${agent.customer_id} and portal_calls.agent_id=${agent.id}`;
      return Response.json({ ok: true });
    }
    throw new ApiError("Not found.", 404);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "Runtime request rejected.",
      },
      {
        status:
          error instanceof ApiError
            ? error.status
            : error instanceof z.ZodError
              ? 400
              : 500,
      },
    );
  }
}
export { handler as GET, handler as POST };
