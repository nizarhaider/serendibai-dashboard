import { cookies } from "next/headers";
import { z } from "zod";
import { db, audit } from "@/lib/db";
import {
  ApiError,
  checkOrigin,
  requireUser,
  login,
  digest,
  encrypt,
  decrypt,
  rateLimit,
} from "@/lib/auth";
import { getData } from "@/lib/data";
import { agentAction, compute, offers } from "@/lib/vast";
import { draftPrompt } from "@/lib/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.string().uuid();
const product = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(100).default(""),
  description: z.string().max(5000).default(""),
  category: z.string().max(100).default("Product"),
  price: z.coerce.number().min(0).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("LKR"),
  stock: z.coerce.number().int().min(0).nullable(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});
const agentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company_url: z.union([z.literal(""), z.url()]).default(""),
  system_prompt: z.string().max(30000).default(""),
  greeting: z.string().max(1000).default("Hello! How can I help you today?"),
  voice: z.enum(["Kore", "Aoede", "Puck", "Charon", "Fenrir"]).default("Kore"),
  languages: z
    .array(z.enum(["English", "Sinhala", "Tamil"]))
    .min(1)
    .default(["English", "Sinhala", "Tamil"]),
  tools: z
    .array(
      z.enum([
        "search_knowledge",
        "search_products",
        "book_appointment",
        "create_order",
        "create_ticket",
        "send_whatsapp_message",
      ]),
    )
    .default(["search_knowledge", "search_products", "book_appointment", "create_order", "create_ticket"]),
  max_calls: z.coerce.number().int().min(1).max(20).default(3),
  hourly_budget: z.coerce.number().min(0.02).max(2).default(0.2),
  phone_number_id: z.string().regex(/^\d*$/).max(30).default(""),
  credentials: z.record(z.string(), z.string().max(4000)).optional(),
});
async function handler(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  try {
    const path = (await context.params).path || [],
      route = path[0],
      id = path[1],
      method = request.method;
    if (method !== "GET") checkOrigin(request);
    if (route === "login" && method === "POST") {
      const body = z
        .object({
          email: z.email().max(250),
          password: z.string().min(1).max(200),
        })
        .parse(await request.json());
      await login(
        body.email,
        body.password,
        request.headers.get("x-nf-client-connection-ip") || "local",
      );
      return Response.json({ ok: true });
    }
    const user = await requireUser(),
      customer = user.customer_id,
      sql = db();
    if (method !== "GET") await rateLimit(`write:${user.id}`, 120, 60);
    if (route === "logout" && method === "POST") {
      const store = await cookies();
      await sql`delete from portal_sessions where token_hash=${digest(store.get("portal_session")?.value || "")}`;
      store.delete("portal_session");
      return Response.json({ ok: true });
    }
    if (route === "data" && method === "GET") {
      const url = new URL(request.url),
        days = z.coerce
          .number()
          .int()
          .min(7)
          .max(90)
          .parse(url.searchParams.get("days") || 30),
        filter = url.searchParams.get("agent");
      return Response.json(
        await getData(
          customer,
          user.email,
          days,
          filter ? uuid.parse(filter) : undefined,
        ),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (route === "compute" && method === "GET")
      return Response.json({ instances: await compute(customer) });
    if (route === "offers" && method === "GET")
      return Response.json({
        offers: await offers(
          z.coerce
            .number()
            .min(0.02)
            .max(2)
            .parse(new URL(request.url).searchParams.get("budget") || 0.2),
        ),
      });
    if (route === "assistant" && method === "POST") {
      await rateLimit(`ai:${user.id}`, 15, 3600);
      const { prompt } = z
        .object({ prompt: z.string().min(5).max(4000) })
        .parse(await request.json());
      const result = await draftPrompt(prompt);
      await audit(customer, "Prompt researched", prompt.slice(0, 160));
      return Response.json(result);
    }
    if (route === "quotas" && method === "PUT") {
      const b = z
        .object({
          tokens: z.coerce.number().int().positive().max(100000000),
          minutes: z.coerce.number().int().positive().max(100000),
          calls: z.coerce.number().int().positive().max(100000),
        })
        .parse(await request.json());
      await sql`update portal_quotas set tokens=${b.tokens},minutes=${b.minutes},calls=${b.calls} where customer_id=${customer}`;
      await audit(
        customer,
        "Workspace limits updated",
        "Monthly token, minute and call allowances changed.",
      );
      return Response.json({ ok: true });
    }
    if (id && method === "PATCH" && ["orders", "tickets", "appointments"].includes(route || "")) {
      uuid.parse(id);
      const statuses = {
        orders: z.enum(["placed", "processing", "completed", "cancelled"]),
        tickets: z.enum(["open", "in_progress", "resolved", "closed"]),
        appointments: z.enum(["booked", "completed", "cancelled"]),
      } as const;
      const status = statuses[route as keyof typeof statuses].parse(
        z.object({ status: z.string() }).parse(await request.json()).status,
      );
      const rows = route === "orders"
        ? await sql`update portal_orders set status=${status},updated_at=now() where id=${id} and customer_id=${customer} returning customer_name as name`
        : route === "tickets"
          ? await sql`update portal_tickets set status=${status},updated_at=now() where id=${id} and customer_id=${customer} returning subject as name`
          : await sql`update portal_appointments set status=${status} where id=${id} and customer_id=${customer} returning service as name`;
      if (!rows.length) throw new ApiError("Record not found.", 404);
      await audit(customer, `${route.slice(0, -1)} status changed`, `${rows[0].name}: ${status}`);
      return Response.json({ ok: true });
    }
    if (route === "agents") {
      if (id) uuid.parse(id);
      if (id && path[2] === "action" && method === "POST") {
        const b = z
          .object({
            action: z.enum(["deploy", "start", "stop", "restart", "destroy"]),
            offerId: z.number().int().positive().optional(),
          })
          .parse(await request.json());
        return Response.json(
          await agentAction(customer, id, b.action, b.offerId),
        );
      }
      if (method === "POST" || method === "PUT") {
        const b = agentSchema.parse(await request.json());
        const count =
          await sql`select id from portal_agents where customer_id=${customer}`;
        if (!id && count.length >= 20)
          throw new ApiError("Workspace limit: 20 agents.");
        let credentials: null | string = null;
        if (b.credentials && Object.values(b.credentials).some(Boolean)) {
          const [existing] = id
            ? await sql`select credentials from portal_agents where id=${id} and customer_id=${customer}`
            : [];
          const allowed = [
            "GEMINI_API_KEY",
            "WHATSAPP_ACCESS_TOKEN",
            "WHATSAPP_APP_SECRET",
            "VERIFY_TOKEN",
          ];
          credentials = encrypt({
            ...decrypt(existing?.credentials),
            ...Object.fromEntries(
              Object.entries(b.credentials).filter(
                ([k, v]) => allowed.includes(k) && v,
              ),
            ),
          });
        }
        const rows = id
          ? await sql`update portal_agents set name=${b.name},company_url=${b.company_url},system_prompt=${b.system_prompt},greeting=${b.greeting},voice=${b.voice},languages=${b.languages},tools=${b.tools},max_calls=${b.max_calls},hourly_budget=${b.hourly_budget},phone_number_id=${b.phone_number_id},credentials=coalesce(${credentials},credentials),version=version+1,updated_at=now() where id=${id} and customer_id=${customer} returning id`
          : await sql`insert into portal_agents(customer_id,name,company_url,system_prompt,greeting,voice,languages,tools,max_calls,hourly_budget,phone_number_id,credentials) values(${customer},${b.name},${b.company_url},${b.system_prompt},${b.greeting},${b.voice},${b.languages},${b.tools},${b.max_calls},${b.hourly_budget},${b.phone_number_id},${credentials}) returning id`;
        if (!rows.length) throw new ApiError("Agent not found.", 404);
        await audit(
          customer,
          id ? "Agent configuration saved" : "Agent created",
          b.name,
          rows[0].id,
        );
        return Response.json({ id: rows[0].id });
      }
      if (id && method === "DELETE") {
        const [a] =
          await sql`select name,instance_id from portal_agents where id=${id} and customer_id=${customer}`;
        if (!a) throw new ApiError("Agent not found.", 404);
        if (a.instance_id)
          throw new ApiError(
            "Destroy this agent’s compute before deleting its configuration.",
          );
        await sql.transaction([
          sql`update portal_calls set agent_id=null where agent_id=${id} and customer_id=${customer}`,
          sql`update portal_events set agent_id=null where agent_id=${id} and customer_id=${customer}`,
          sql`delete from portal_agents where id=${id} and customer_id=${customer}`,
        ]);
        return Response.json({ ok: true });
      }
    }
    if (route === "products") {
      if (method === "POST") {
        const { rows } = z
          .object({ rows: z.array(product).min(1).max(500) })
          .parse(await request.json());
        for (const row of rows.filter((r) => r.id)) {
          const [own] =
            await sql`select id from portal_products where id=${row.id} and customer_id=${customer}`;
          if (!own) throw new ApiError("Product not found.", 404);
        }
        await sql.transaction(
          rows.map((b) =>
            b.id
              ? sql`update portal_products set name=${b.name},sku=${b.sku},description=${b.description},category=${b.category},price=${b.price},currency=${b.currency},stock=${b.stock},status=${b.status},updated_at=now() where id=${b.id} and customer_id=${customer}`
              : sql`insert into portal_products(customer_id,name,sku,description,category,price,currency,stock,status) values(${customer},${b.name},${b.sku},${b.description},${b.category},${b.price},${b.currency},${b.stock},${b.status})`,
          ),
        );
        await audit(
          customer,
          "Catalogue updated",
          `${rows.length} product or service rows saved.`,
        );
        return Response.json({ ok: true, count: rows.length });
      }
      if (id && method === "DELETE") {
        uuid.parse(id);
        await sql`delete from portal_products where id=${id} and customer_id=${customer}`;
        return Response.json({ ok: true });
      }
    }
    if (route === "documents") {
      if (method === "POST") {
        if (Number(request.headers.get("content-length")) > 5500000)
          throw new ApiError("Maximum upload size is 5 MB.", 413);
        const form = await request.formData(),
          file = form.get("file");
        if (!(file instanceof File) || file.size > 5000000 || file.size === 0)
          throw new ApiError("Choose a non-empty file smaller than 5 MB.");
        const bytes = Buffer.from(await file.arrayBuffer()),
          ext = file.name.split(".").pop()?.toLowerCase();
        let content = "";
        if (["txt", "md", "csv"].includes(ext || ""))
          content = bytes.toString("utf8");
        else if (ext === "pdf") {
          const { extractText } = await import("unpdf");
          content = (
            await extractText(new Uint8Array(bytes), { mergePages: true })
          ).text;
        } else if (ext === "docx") {
          const { extractRawText } = await import("mammoth");
          content = (await extractRawText({ buffer: bytes })).value;
        } else
          throw new ApiError("Supported files: PDF, DOCX, TXT, MD and CSV.");
        if (content.trim().length < 10)
          throw new ApiError(
            "No readable text found. For scanned PDFs, upload a text-searchable version.",
          );
        if (content.length > 500000)
          throw new ApiError(
            "Document exceeds 500,000 characters. Split it into smaller files.",
          );
        const [{ count }] =
          await sql`select count(*)::int as count from portal_documents where customer_id=${customer}`;
        if (count >= 100)
          throw new ApiError("Workspace document limit reached (100).");
        await sql`insert into portal_documents(customer_id,name,content,bytes,type) values(${customer},${file.name.slice(0, 200)},${content},${file.size},${ext})`;
        await audit(customer, "Knowledge uploaded", file.name.slice(0, 200));
        return Response.json({ ok: true });
      }
      if (id && method === "GET") {
        uuid.parse(id);
        const [doc] =
          await sql`select name,content from portal_documents where id=${id} and customer_id=${customer}`;
        if (!doc) throw new ApiError("Document not found.", 404);
        return Response.json(doc);
      }
      if (id && method === "DELETE") {
        uuid.parse(id);
        await sql`delete from portal_documents where id=${id} and customer_id=${customer}`;
        return Response.json({ ok: true });
      }
    }
    throw new ApiError("Not found.", 404);
  } catch (error) {
    const status =
      error instanceof ApiError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof z.ZodError
          ? error.issues
              .map((x) => `${x.path.join(".")}: ${x.message}`)
              .join("; ")
          : "Something went wrong. Please retry.";
    if (status === 500)
      console.error(
        "Portal request failed",
        error instanceof Error ? error.name : "Unknown",
      );
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
