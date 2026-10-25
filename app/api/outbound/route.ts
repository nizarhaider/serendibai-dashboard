import { randomBytes } from "node:crypto";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { ApiError, checkOrigin, requireUser, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseSignature, normalizePhone } from "@/lib/cases";
import { validRuntimeUrl } from "@/lib/runtime";
import { extractResults, generateFields } from "@/lib/outbound";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.string().uuid();
const headers = { "Cache-Control": "private, no-store" };

async function handler(request: Request) {
  try {
    const user = await requireUser();
    if (user.read_only) throw new ApiError("This account can only view calls.", 403);
    const sql = db();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (request.method === "GET") {
      if (!id) {
        const batches = await sql`select b.id,b.name,b.created_at,count(r.id)::int as rows from portal_outbound_batches b left join portal_outbound_rows r on r.batch_id=b.id where b.customer_id=${user.customer_id} group by b.id order by b.created_at desc limit 30`;
        return Response.json(batches, { headers });
      }
      uuid.parse(id);
      const [batch] = await sql`select b.id,b.name,b.instructions,b.columns,b.headers,b.agent_id,b.created_at from portal_outbound_batches b where b.id=${id} and b.customer_id=${user.customer_id}`;
      if (!batch) throw new ApiError("Campaign not found.", 404);
      const rows = await sql`select r.id,r.phone,r.data,r.result,q.state,q.error,q.call_id,c.transcript from portal_outbound_rows r left join portal_case_requests q on q.outbound_row_id=r.id left join portal_calls c on c.id=b.agent_id::text||':'||q.call_id where r.batch_id=${id} order by r.created_at,r.id`;
      if (url.searchParams.get("format") === "csv") {
        const output = stringify(rows.map(row => Object.fromEntries([...batch.headers, ...batch.columns].map((column: string) => {
          const value = String(row.result?.[column] ?? row.data[column] ?? "");
          return [column, /^[\s]*[=+@-]/.test(value) ? `'${value}` : value];
        }))), { header: true, columns: [...batch.headers, ...batch.columns], bom: true });
        return new Response(output, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="outbound-${id}.csv"` } });
      }
      return Response.json({ batch, rows }, { headers });
    }
    checkOrigin(request);
    await rateLimit(`outbound:${user.id}`, 120, 3600);
    if (request.method === "POST" && !id) {
      const form = await request.formData();
      const file = form.get("file");
      const instructions = z.string().trim().min(20).max(6000).parse(form.get("instructions"));
      const agentId = uuid.parse(form.get("agent_id"));
      const phoneColumn = z.string().min(1).max(100).parse(form.get("phone_column"));
      if (!(file instanceof File) || file.size > 1000000 || !file.name.toLowerCase().endsWith(".csv")) throw new ApiError("Upload a CSV under 1 MB.");
      const records = parse(await file.text(), { columns: true, bom: true, skip_empty_lines: true, relax_quotes: false }) as Record<string, string>[];
      const columns = records.length ? Object.keys(records[0]) : [];
      if (!columns.includes(phoneColumn) || records.length > 500 || !records.length || columns.length > 50) throw new ApiError("CSV needs a phone column and 1–500 rows.");
      const phones = records.map((row, index) => {
        try { return normalizePhone(row[phoneColumn] || ""); }
        catch { throw new ApiError(`Invalid phone number on row ${index + 2}.`); }
      });
      const [agent] = await sql`select id from portal_agents where id=${agentId} and customer_id=${user.customer_id} and status<>'archived'`;
      if (!agent) throw new ApiError("Agent not found.", 404);
      const resultColumns = await generateFields(instructions, columns);
      const [batch] = await sql`insert into portal_outbound_batches(customer_id,agent_id,name,instructions,columns,headers) values(${user.customer_id},${agentId},${file.name.slice(0, 120)},${instructions},${JSON.stringify(resultColumns)}::jsonb,${JSON.stringify(columns)}::jsonb) returning id`;
      await sql.transaction(records.map((row, index) => sql`insert into portal_outbound_rows(batch_id,phone,data) values(${batch.id},${phones[index]},${JSON.stringify(row)}::jsonb)`));
      return Response.json({ id: batch.id }, { status: 201, headers });
    }
    if (!id) throw new ApiError("Campaign not found.", 404);
    uuid.parse(id);
    const action = url.searchParams.get("action");
    const body = await request.json();
    const rowId = uuid.parse(body.row_id);
    const [row] = await sql`select r.id,r.phone,r.data,r.result,b.instructions,b.columns,b.agent_id,b.customer_id from portal_outbound_rows r join portal_outbound_batches b on b.id=r.batch_id where r.id=${rowId} and b.id=${id} and b.customer_id=${user.customer_id}`;
    if (!row) throw new ApiError("Row not found.", 404);
    if (action === "call") {
      const [runtime] = await sql`select runtime.id,runtime.telemetry->>'runtime_url' as runtime_url from portal_agents agent left join portal_agent_cases c on c.agent_id=agent.id join portal_agents runtime on runtime.id=coalesce(c.runtime_agent_id,agent.id) where agent.id=${row.agent_id} and runtime.status='ready' and runtime.heartbeat_at>now()-interval '90 seconds'`;
      if (!runtime || !validRuntimeUrl(runtime.runtime_url || "")) throw new ApiError("The voice agent is offline.", 503);
      const requestId = randomBytes(16).toString("hex");
      const [created] = await sql`insert into portal_case_requests(id,phone,case_slug,runtime_agent_id,direction,outbound_row_id) values(${requestId},${row.phone},null,${runtime.id},'outbound',${row.id}) on conflict(runtime_agent_id,phone) do update set id=excluded.id,case_slug=null,outbound_row_id=excluded.outbound_row_id,direction='outbound',state='pending',call_id=null,message_id=null,error='',expires_at=now()+interval '10 minutes',created_at=now() where portal_case_requests.state not in ('preparing','permission','calling') or portal_case_requests.expires_at<now() returning id`;
      if (!created) throw new ApiError("A call is already in progress for this number.", 409);
      await sql`update portal_outbound_rows set result=null where id=${row.id}`;
      const payload = JSON.stringify({ id: requestId, phone: row.phone, timestamp: Math.floor(Date.now() / 1000) });
      try {
        const response = await fetch(`${runtime.runtime_url}/outbound/call`, { method: "POST", headers: { "Content-Type": "application/json", "x-demo-signature": caseSignature(payload) }, body: payload, signal: AbortSignal.timeout(25000), redirect: "error" });
        if (!response.ok) throw Error("Call unavailable");
      } catch {
        await sql`update portal_case_requests set state='failed',error='Could not start the call.' where id=${requestId} and state='pending'`;
      }
      return Response.json({ ok: true }, { headers });
    }
    if (action === "result") {
      const [call] = await sql`select q.state,c.transcript from portal_case_requests q join portal_calls c on c.id=${row.agent_id}::text||':'||q.call_id where q.outbound_row_id=${row.id} and q.state='completed'`;
      if (!call?.transcript) throw new ApiError("A completed call transcript is not available yet.");
      const result = await extractResults(row.instructions, row.columns, row.data, call.transcript);
      await sql`update portal_outbound_rows set result=${JSON.stringify(result)}::jsonb where id=${row.id}`;
      return Response.json({ result }, { headers });
    }
    throw new ApiError("Not found.", 404);
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : error instanceof z.ZodError ? "Please check the form fields." : "Request failed." }, { status: error instanceof ApiError ? error.status : 400, headers });
  }
}

export { handler as GET, handler as POST };
