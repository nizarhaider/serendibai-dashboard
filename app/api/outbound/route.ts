import { createHash, randomBytes, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { ApiError, checkOrigin, requireUser, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseSignature, normalizePhone } from "@/lib/cases";
import { validRuntimeUrl } from "@/lib/runtime";
import { extractResults } from "@/lib/outbound";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.string().uuid();
const headers = { "Cache-Control": "private, no-store" };
const instructions = "Call on behalf of Talent 360. Confirm the candidate's current role and years of experience, asking one question at a time. Record each as verified, corrected, not confirmed or not assessed, and note corrections. Ask the candidate to describe their work in English and rate spoken English as basic, intermediate or advanced with a brief evidence-based reason. Use not assessed when unanswered or unclear. Never guess or promise a job.";
const resultFields = ["role_verification", "confirmed_role", "experience_verification", "confirmed_years_experience", "spoken_english_level", "english_assessment_notes"];
const compactPhone = (value: string) => value.trim().replace(/[\s()-]/g, "");
const isMobileNumber = (value: string) => /^(?:(?:\+?94|0094)?7\d{8}|07\d{8}|\+\d{8,15}|00\d{8,15})$/.test(compactPhone(value));
const normalizeMobile = (value: string) => {
  const phone = compactPhone(value);
  if (/^7\d{8}$/.test(phone)) return `94${phone}`;
  if (/^07\d{8}$/.test(phone)) return `94${phone.slice(1)}`;
  return normalizePhone(value);
};

async function handler(request: Request) {
  try {
    const user = await requireUser();
    if (user.read_only) throw new ApiError("This account can only view calls.", 403);
    const sql = db();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (request.method === "GET") {
      if (!id) {
        const batches = await sql`select id,name,created_at,rows from (select distinct on (coalesce(b.source_hash,b.id::text)) b.id,b.name,b.created_at,(select count(*)::int from portal_outbound_rows r where r.batch_id=b.id) as rows from portal_outbound_batches b where b.customer_id=${user.customer_id} order by coalesce(b.source_hash,b.id::text),b.created_at desc) lists order by created_at desc limit 30`;
        return Response.json(batches, { headers });
      }
      uuid.parse(id);
      const [batch] = await sql`select b.id,b.name,b.instructions,b.columns,b.headers,b.agent_id,b.created_at from portal_outbound_batches b where b.id=${id} and b.customer_id=${user.customer_id}`;
      if (!batch) throw new ApiError("Call list not found.", 404);
      const rows = await sql`select r.id,r.phone,r.data,r.result,case when q.expires_at<now() and q.state in ('pending','preparing','permission','calling') then 'expired' else q.state end as state,q.error,q.call_id,c.status as call_status,c.transcript from portal_outbound_rows r left join portal_case_requests q on q.outbound_row_id=r.id left join portal_calls c on c.id=${batch.agent_id}::text||':'||q.call_id where r.batch_id=${id} order by r.created_at,r.id`;
      if (url.searchParams.get("format") === "csv") {
        const output = stringify(rows.map(row => Object.fromEntries([...batch.headers, ...batch.columns].map((column: string) => {
          const value = String(row.result?.[column] ?? row.data[column] ?? "");
          return [column, /^[\s]*[=+@-]/.test(value) ? `'${value}` : value];
        }))), { header: true, columns: [...batch.headers, ...batch.columns], bom: true });
        return new Response(output, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="outbound-${id}.csv"` } });
      }
      return Response.json({ batch: { id: batch.id, name: batch.name }, rows }, { headers });
    }
    checkOrigin(request);
    await rateLimit(`outbound:${user.id}`, 1000, 3600);
    if (request.method === "POST" && !id) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 4000000 || !file.name.toLowerCase().endsWith(".csv")) throw new ApiError("Upload a CSV under 4 MB.");
      const records = parse(await file.text(), { columns: (names: string[]) => {
        if (names.some(name => !name.trim()) || new Set(names).size !== names.length) throw new ApiError("Use unique, non-empty column headings.");
        return names;
      }, bom: true, skip_empty_lines: true, relax_quotes: false }) as Record<string, string>[];
      const columns = records.length ? Object.keys(records[0]) : [];
      if (!records.length) throw new ApiError("CSV needs a header row and at least one contact.");
      const phoneColumn = columns.map(column => ({ column, matches: records.filter(row => isMobileNumber(row[column] || "")).length })).sort((a, b) => b.matches - a.matches)[0];
      if (!phoneColumn?.matches) throw new ApiError("Include a mobile number column with values like +94742530708 or 742530708.");
      const phones = records.map((row, index) => {
        try { return normalizeMobile(row[phoneColumn.column] || ""); }
        catch { throw new ApiError(`Invalid phone number on row ${index + 2}.`); }
      });
      const [agent] = await sql`select id from portal_agents where customer_id=${user.customer_id} and status<>'archived' order by created_at desc limit 1`;
      if (!agent) throw new ApiError("No active voice agent is available.", 503);
      const usedColumns = new Set(columns);
      const resultColumns = resultFields.map(field => {
        while (usedColumns.has(field)) field = `result_${field}`;
        usedColumns.add(field);
        return field;
      });
      const sourceHash = createHash("sha256").update(JSON.stringify({ name: file.name.slice(0, 120), agentId: agent.id, instructions, headers: columns, rows: records.map((row, index) => JSON.stringify([phones[index], ...columns.map(column => row[column] || "")])).sort() })).digest("hex");
      const [existing] = await sql`select id from portal_outbound_batches where customer_id=${user.customer_id} and source_hash=${sourceHash} order by created_at desc limit 1`;
      if (existing) return Response.json({ id: existing.id }, { headers });
      const batchId = randomUUID();
      await sql.transaction([
        sql`insert into portal_outbound_batches(id,customer_id,agent_id,name,instructions,columns,headers,source_hash) values(${batchId},${user.customer_id},${agent.id},${file.name.slice(0, 120)},${instructions},${JSON.stringify(resultColumns)}::jsonb,${JSON.stringify(columns)}::jsonb,${sourceHash})`,
        sql`insert into portal_outbound_rows(batch_id,phone,data) select ${batchId},phone,data from jsonb_to_recordset(${JSON.stringify(records.map((data, index) => ({ phone: phones[index], data })))}::jsonb) as rows(phone text,data jsonb)`,
      ]);
      return Response.json({ id: batchId }, { status: 201, headers });
    }
    if (!id) throw new ApiError("Call list not found.", 404);
    uuid.parse(id);
    const action = url.searchParams.get("action");
    const body = await request.json();
    const rowId = uuid.parse(body.row_id);
    const [row] = await sql`select r.id,r.phone,r.data,r.result,b.instructions,b.columns,b.agent_id,b.customer_id from portal_outbound_rows r join portal_outbound_batches b on b.id=r.batch_id where r.id=${rowId} and b.id=${id} and b.customer_id=${user.customer_id}`;
    if (!row) throw new ApiError("Row not found.", 404);
    if (action === "call") {
      const [runtime] = await sql`select runtime.id,runtime.telemetry->>'runtime_url' as runtime_url from portal_agents agent left join portal_agent_cases c on c.agent_id=agent.id join portal_agents runtime on runtime.id=coalesce(c.runtime_agent_id,agent.id) where agent.id=${row.agent_id} and agent.status<>'archived' and runtime.status='ready' and runtime.heartbeat_at>now()-interval '90 seconds'`;
      if (!runtime || !validRuntimeUrl(runtime.runtime_url || "")) throw new ApiError("The voice agent is offline.", 503);
      const requestId = randomBytes(16).toString("hex");
      const [created] = await sql`insert into portal_case_requests(id,phone,case_slug,runtime_agent_id,direction,outbound_row_id) values(${requestId},${row.phone},null,${runtime.id},'outbound',${row.id}) on conflict(runtime_agent_id,phone) do update set id=excluded.id,case_slug=null,outbound_row_id=excluded.outbound_row_id,direction='outbound',state='pending',call_id=null,message_id=null,error='',expires_at=now()+interval '10 minutes',created_at=now() where portal_case_requests.state not in ('pending','preparing','permission','calling') or portal_case_requests.expires_at<now() returning id`;
      if (!created) throw new ApiError("A call is already in progress for this number.", 409);
      await sql`update portal_outbound_rows set result=null where id=${row.id}`;
      const payload = JSON.stringify({ id: requestId, phone: row.phone, timestamp: Math.floor(Date.now() / 1000) });
      try {
        const response = await fetch(`${runtime.runtime_url}/outbound/call`, { method: "POST", headers: { "Content-Type": "application/json", "x-demo-signature": caseSignature(payload) }, body: payload, signal: AbortSignal.timeout(25000), redirect: "error" });
        if (!response.ok) throw Error("Call unavailable");
      } catch {
        await sql`update portal_case_requests set state='failed',error='Could not start the call.' where id=${requestId} and state='pending'`;
        throw new ApiError("Could not start the call. Refresh its status before retrying.", 502);
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
