import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
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
  hashPassword,
} from "@/lib/auth";
import { getData } from "@/lib/data";
import { canAccessSection, resourceTools, standardTools, toolNames } from "@/lib/permissions";
import { getCustomers } from "@/lib/customers";
import { sendInvitation } from "@/lib/invitations";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.string().uuid();
const product = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(100).default(""),
  description: z.string().max(5000).default(""),
  category: z.string().max(100).default("Product"),
  unit: z.string().trim().min(1).max(50).default("unit"),
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
  company_name: z.string().trim().min(1).max(160),
  company_url: z.union([z.literal(""), z.url()]).default(""),
  greeting: z.string().trim().min(1).max(1500),
  system_prompt: z.string().trim().min(1).max(30000),
  text_reply_instructions: z.string().trim().max(30000).default(""),
  voice: z.enum(["Aoede", "Charon"]).default("Aoede"),
  languages: z
    .array(z.enum(["English", "Sinhala", "Tamil"]))
    .min(1)
    .default(["English", "Sinhala", "Tamil"]),
  tools: z
    .array(
      z.enum([
        "book_appointment",
        "create_order",
        "create_ticket",
        "search_knowledge",
        "search_products",
        "send_whatsapp_message",
        "send_product_image",
      ]),
    )
    .default([...standardTools, ...toolNames]),
  max_calls: z.coerce.number().int().min(1).max(20).default(3),
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
    if (route === "customers") {
      if (!user.is_admin) throw new ApiError("Administrator access required.", 403);
      if (method === "GET") return Response.json(await getCustomers(), { headers: { "Cache-Control": "private, no-store" } });
      if (id && path[2] === "users" && method === "POST") {
        uuid.parse(id);
        const b = z.object({ contact_name: z.string().trim().min(1).max(160), email: z.email().max(250).transform(v => v.toLowerCase()) }).parse(await request.json());
        const [workspace] = await sql`select id from customers c where c.id=${id} and not exists(select 1 from portal_users u where u.customer_id=c.id and u.is_admin)`;
        if (!workspace) throw new ApiError("Customer workspace not found.", 404);
        const [existing] = await sql`select id from portal_users where email=${b.email}`;
        if (existing) throw new ApiError("That email already has an account.", 409);
        const userId = randomUUID();
        await sql`insert into portal_users(id,email,password_hash,customer_id,display_name) values(${userId},${b.email},${hashPassword(randomBytes(32).toString("hex"))},${id},${b.contact_name})`;
        await audit(id, "Workspace user invited", b.email);
        try { await sendInvitation(userId, b.email, b.contact_name); return Response.json({ invitation_sent: true }, { status: 201 }); }
        catch (error) { console.error("Invitation delivery failed", error instanceof Error ? error.name : "Unknown"); return Response.json({ invitation_sent: false }, { status: 201 }); }
      }
      if (id && path[2] === "users" && path[3] && method === "DELETE") {
        uuid.parse(id); const userId = uuid.parse(path[3]);
        const [target] = await sql`delete from portal_users where id=${userId} and customer_id=${id} and not is_admin returning email`;
        if (!target) throw new ApiError("Customer user not found.", 404);
        await audit(id, "Workspace user removed", target.email);
        return Response.json({ ok: true });
      }
      if (id && method === "DELETE") {
        uuid.parse(id);
        const [target] = await sql`select c.business_name from customers c where c.id=${id} and not exists(select 1 from portal_users u where u.customer_id=c.id and u.is_admin)`;
        const links = await sql`select id from portal_whatsapp_links where customer_id=${id}`;
        if (!target) throw new ApiError("Customer workspace not found.", 404);
        for (const link of links) {
          if (!process.env.LINKED_SERVICE_URL || !process.env.LINKED_BRIDGE_SECRET) throw new ApiError("Disable the WhatsApp connection before deleting this workspace.", 503);
          try {
            const response = await fetch(`${process.env.LINKED_SERVICE_URL}/connection`, { method: "DELETE", headers: { Authorization: `Bearer ${process.env.LINKED_BRIDGE_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ customer: link.id }), signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error();
          } catch { throw new ApiError("Could not stop the WhatsApp connection. Please try again.", 503); }
        }
        await sql.transaction([
          sql`delete from portal_case_requests where runtime_agent_id in(select id from portal_agents where customer_id=${id}) or case_slug in(select slug from portal_agent_cases where agent_id in(select id from portal_agents where customer_id=${id}) or runtime_agent_id in(select id from portal_agents where customer_id=${id}))`,
          sql`delete from portal_agent_cases where agent_id in(select id from portal_agents where customer_id=${id}) or runtime_agent_id in(select id from portal_agents where customer_id=${id})`,
          sql`delete from portal_setup_tokens where customer_id=${id}`,
          sql`delete from portal_whatsapp_links where customer_id=${id}`,
          sql`delete from portal_calls where customer_id=${id}`,
          sql`delete from portal_events where customer_id=${id}`,
          sql`delete from portal_documents where customer_id=${id}`,
          sql`delete from portal_products where customer_id=${id}`,
          sql`delete from portal_outbound_batches where customer_id=${id}`,
          sql`delete from portal_users where customer_id=${id}`,
          sql`delete from portal_agents where customer_id=${id}`,
          sql`delete from customers where id=${id}`,
          sql`insert into portal_events(customer_id,action,detail) values(${customer},'Customer workspace deleted',${target.business_name})`,
        ]);
        return Response.json({ ok: true });
      }
      const permissions = z.object({ read_only: z.boolean(), allowed_tools: z.array(z.enum(toolNames)) });
      if (method === "POST") {
        const b = permissions.extend({
          business_name: z.string().trim().min(1).max(160),
          contact_name: z.string().trim().min(1).max(160),
          email: z.email().max(250).transform(v => v.toLowerCase()),
        }).parse(await request.json());
        const [existing] = await sql`select id from portal_users where email=${b.email}`;
        if (existing) throw new ApiError("That email already has an account.", 409);
        const unclaimed = await sql`select id from customers c where lower(c.business_name)=lower(${b.business_name}) and not exists(select 1 from portal_users u where u.customer_id=c.id) limit 2`;
        if (unclaimed.length > 1) throw new ApiError("More than one workspace has that name. Choose a unique name.", 409);
        const customerId = unclaimed[0]?.id || randomUUID(), userId = randomUUID();
        const passwordHash = hashPassword(randomBytes(32).toString("hex"));
        if (unclaimed.length) {
          await sql.transaction([
            sql`update customers set contact_name=${b.contact_name},email=${b.email},portal_read_only=${b.read_only},portal_tools=${b.allowed_tools} where id=${customerId}`,
            sql`insert into portal_users(id,email,password_hash,customer_id,display_name) values(${userId},${b.email},${passwordHash},${customerId},${b.contact_name})`,
          ]);
        } else {
          await sql.transaction([
            sql`insert into customers(id,business_name,contact_name,email,portal_read_only,portal_tools) values(${customerId},${b.business_name},${b.contact_name},${b.email},${b.read_only},${b.allowed_tools})`,
            sql`insert into portal_users(id,email,password_hash,customer_id,display_name) values(${userId},${b.email},${passwordHash},${customerId},${b.contact_name})`,
            sql`insert into portal_agents(customer_id,name,company_name,phone_number_id,tools) values(${customerId},${b.business_name + " agent"},${b.business_name},'',${[...standardTools, ...b.allowed_tools]})`,
          ]);
        }
        await audit(customerId, "Customer created", b.business_name);
        try { await sendInvitation(userId, b.email, b.contact_name); return Response.json({ id: customerId, invitation_sent: true }, { status: 201 }); }
        catch (error) { console.error("Invitation delivery failed", error instanceof Error ? error.name : "Unknown"); return Response.json({ id: customerId, invitation_sent: false }, { status: 201 }); }
      }
      if (id && path[2] === "invite" && method === "POST") {
        uuid.parse(id);
        const [target] = await sql`select u.id,u.email,u.display_name from portal_users u where u.customer_id=${id} and not u.is_admin and not u.onboarding_completed limit 1`;
        if (!target) throw new ApiError("No pending invitation for this customer.", 404);
        try { await sendInvitation(target.id, target.email, target.display_name); }
        catch (error) { console.error("Invitation delivery failed", error instanceof Error ? error.name : "Unknown"); throw new ApiError("Invitation could not be sent. Please try again.", 503); }
        return Response.json({ ok: true });
      }
      if (id && method === "PUT") {
        uuid.parse(id);
        const b = permissions.parse(await request.json());
        const [target] = await sql`select id from customers where id=${id}`;
        if (!target) throw new ApiError("Customer not found.", 404);
        await sql.transaction([
          sql`update customers set portal_read_only=${b.read_only},portal_tools=${b.allowed_tools} where id=${id}`,
          sql`update portal_agents set tools=${[...standardTools, ...b.allowed_tools]},version=version+1,updated_at=now() where customer_id=${id} and status<>'archived'`,
        ]);
        await audit(id, "Customer access updated", `Features: ${b.allowed_tools.join(", ") || "none"}; editing: ${!b.read_only}`);
        return Response.json({ ok: true });
      }
      throw new ApiError("Not found.", 404);
    }
    if (user.is_admin && !["data", "logout", "agents"].includes(route || "")) throw new ApiError("Customer workspace access required.", 403);
    if (!user.is_admin && !user.onboarding_completed && !["onboarding", "logout"].includes(route || ""))
      throw new ApiError("Complete WhatsApp onboarding before opening the workspace.", 403);
    if (!user.is_admin && user.read_only && !["data", "logout", "onboarding"].includes(route || ""))
      throw new ApiError("This account can only view calls and transcripts.", 403);
    if (route === "onboarding" || route === "connections") {
      if (method === "GET") {
        const links = await sql`select id,agent_id,phone,enabled,status,case when qr_expires_at>now() then qr else null end as qr,qr_expires_at,error,voice_enabled,message_replies_enabled,message_reply_instructions from portal_whatsapp_links where customer_id=${customer} order by updated_at desc`;
        if (links.some(link => link.status === "connected")) await sql`update portal_users set onboarding_completed=true where customer_id=${customer} and not is_admin`;
        return Response.json(links, { headers: { "Cache-Control": "private, no-store" } });
      }
      if (method === "POST") {
        const b = z.object({ agent_id: uuid, id: uuid.optional(), refresh: z.boolean().optional() }).parse(await request.json());
        const [agent] = await sql`select id from portal_agents where id=${b.agent_id} and customer_id=${customer} and status<>'archived'`;
        if (!agent) throw new ApiError("Choose an assistant.", 404);
        if (!process.env.LINKED_SERVICE_URL || !process.env.LINKED_BRIDGE_SECRET) throw new ApiError("Connection service unavailable.", 503);
        const connection = b.id || randomUUID();
        if (b.id) {
          const [existing] = await sql`select status from portal_whatsapp_links where id=${connection} and customer_id=${customer}`;
          if (!existing) throw new ApiError("Connection not found.", 404);
          if (b.refresh && existing.status === "connected") throw new ApiError("This WhatsApp number is already connected.", 409);
          await sql`update portal_whatsapp_links set agent_id=${b.agent_id},enabled=true,status=case when ${!!b.refresh} then status else 'connecting' end,error='',updated_at=now() where id=${connection} and customer_id=${customer}`;
        } else {
          await sql`insert into portal_whatsapp_links(id,customer_id,agent_id,enabled,status) values(${connection},${customer},${b.agent_id},true,'connecting')`;
        }
        try {
          const response = await fetch(`${process.env.LINKED_SERVICE_URL}/connection`, { method: "POST", headers: { Authorization: `Bearer ${process.env.LINKED_BRIDGE_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ customer: connection, enabled: true, refresh: b.refresh && !!b.id }), signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error();
        } catch {
          if (b.refresh) throw new ApiError("Could not refresh the QR code. Please try again.", 503);
          await sql`update portal_whatsapp_links set enabled=false,status='error',error='Connection service unavailable',qr=null,qr_expires_at=null where id=${connection} and customer_id=${customer}`;
          throw new ApiError("Connection service unavailable. Please try again.", 503);
        }
        return Response.json({ id: connection });
      }
      if (id && method === "DELETE") {
        uuid.parse(id);
        const [link] = await sql`select id from portal_whatsapp_links where id=${id} and customer_id=${customer}`;
        if (!link) throw new ApiError("Connection not found.", 404);
        if (!process.env.LINKED_SERVICE_URL || !process.env.LINKED_BRIDGE_SECRET) throw new ApiError("Connection service unavailable.", 503);
        try {
          const response = await fetch(`${process.env.LINKED_SERVICE_URL}/connection`, { method: "DELETE", headers: { Authorization: `Bearer ${process.env.LINKED_BRIDGE_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ customer: id }), signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error();
        } catch { throw new ApiError("Could not unlink WhatsApp. Check the connection and try again.", 503); }
        await sql`delete from portal_whatsapp_links where id=${id} and customer_id=${customer}`;
        return Response.json({ ok: true });
      }
      if (id && method === "PATCH") {
        uuid.parse(id);
        const b = z.object({ voice_enabled: z.boolean().optional(), message_replies_enabled: z.boolean().optional(), message_reply_instructions: z.string().trim().max(2000).optional() }).parse(await request.json());
        if (b.message_reply_instructions !== undefined && !user.is_admin) throw new ApiError("Administrator access required.", 403);
        const rows = await sql`update portal_whatsapp_links set voice_enabled=coalesce(${b.voice_enabled ?? null},voice_enabled),message_replies_enabled=coalesce(${b.message_replies_enabled ?? null},message_replies_enabled),message_reply_instructions=coalesce(${b.message_reply_instructions ?? null},message_reply_instructions),updated_at=now() where id=${id} and customer_id=${customer} returning id`;
        if (!rows.length) throw new ApiError("Connection not found.", 404);
        return Response.json({ ok: true });
      }
      throw new ApiError("Not found.", 404);
    }
    if (resourceTools[route || ""] && !user.allowed_tools.includes(resourceTools[route || ""]))
      throw new ApiError("This feature is disabled for your workspace.", 403);
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
      const section = z.enum(["dashboard", "messages", "appointments", "orders", "tickets", "knowledge", "catalogue", "agents", "outbound", "admin", "onboarding", "connections"]).parse(url.searchParams.get("section") || "dashboard");
      if (!canAccessSection(user, section)) throw new ApiError("This page is not available for your account.", 403);
      return Response.json(
        await getData(
          customer,
          user.email,
          days,
          filter ? uuid.parse(filter) : undefined,
          section,
          user.is_admin && ["agents", "dashboard"].includes(section) && url.searchParams.get("workspace") ? uuid.parse(url.searchParams.get("workspace")) : undefined,
        ),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (route === "agents" && !user.is_admin) throw new ApiError("Administrator access required.", 403);
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
      const workspace = new URL(request.url).searchParams.get("workspace");
      if (!workspace) throw new ApiError("Choose a customer workspace.", 400);
      const target = uuid.parse(workspace);
      if (target === customer) throw new ApiError("Choose a customer workspace.", 403);
      const [account] = await sql`select portal_tools from customers c where id=${target} and not exists(select 1 from portal_users u where u.customer_id=c.id and u.is_admin)`;
      if (!account) throw new ApiError("Workspace not found.", 404);
      if (id) uuid.parse(id);
      if (method === "POST" || method === "PUT") {
        const b = agentSchema.parse(await request.json());
        if (b.tools.some(tool => toolNames.includes(tool as typeof toolNames[number]) && !account.portal_tools.includes(tool as typeof toolNames[number])))
          throw new ApiError("One or more tools are disabled for your workspace.", 403);
        const tools = [...standardTools, ...b.tools.filter((tool): tool is typeof toolNames[number] => toolNames.includes(tool as typeof toolNames[number]) && account.portal_tools.includes(tool as typeof toolNames[number]))];
        const count =
          await sql`select id from portal_agents where customer_id=${target} and status<>'archived'`;
        if (!id && count.length >= 20)
          throw new ApiError("Workspace limit: 20 agents.");
        let credentials: null | string = null;
        if (b.credentials && Object.values(b.credentials).some(Boolean)) {
          const [existing] = id
            ? await sql`select credentials from portal_agents where id=${id} and customer_id=${target}`
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
          ? await sql`update portal_agents set name=${b.name},company_name=${b.company_name},company_url=${b.company_url},greeting=${b.greeting},system_prompt=${b.system_prompt},text_reply_instructions=${b.text_reply_instructions},voice=${b.voice},languages=${b.languages},tools=${tools},max_calls=${b.max_calls},phone_number_id=${b.phone_number_id},credentials=coalesce(${credentials},credentials),version=version+1,updated_at=now() where id=${id} and customer_id=${target} returning id`
          : await sql`insert into portal_agents(customer_id,name,company_name,company_url,greeting,system_prompt,text_reply_instructions,voice,languages,tools,max_calls,phone_number_id,credentials) values(${target},${b.name},${b.company_name},${b.company_url},${b.greeting},${b.system_prompt},${b.text_reply_instructions},${b.voice},${b.languages},${tools},${b.max_calls},${b.phone_number_id},${credentials}) returning id`;
        if (!rows.length) throw new ApiError("Agent not found.", 404);
        await audit(
          target,
          id ? "Agent configuration saved" : "Agent created",
          b.name,
          rows[0].id,
        );
        return Response.json({ id: rows[0].id });
      }
      if (id && method === "DELETE") {
        const [a] =
          await sql`select name from portal_agents where id=${id} and customer_id=${target}`;
        if (!a) throw new ApiError("Agent not found.", 404);
        await sql`update portal_agents set status='archived',runtime_token_hash=null,version=version+1,updated_at=now() where id=${id} and customer_id=${target}`;
        await audit(target, "Agent archived", a.name, id);
        return Response.json({ ok: true });
      }
    }
    if (route === "products") {
      if (id && path[2] === "image") {
        uuid.parse(id);
        if (method === "GET") {
          const [row] = await sql`select image,image_type from portal_products where id=${id} and customer_id=${customer} and image is not null`;
          if (!row) throw new ApiError("Product image not found.", 404);
          return new Response(row.image, { headers: { "Content-Type": row.image_type, "Cache-Control": "private, no-store" } });
        }
        if (method === "POST") {
          const form = await request.formData(), file = form.get("image");
          if (!(file instanceof File) || file.size === 0 || file.size > 5000000) throw new ApiError("Choose an image smaller than 5 MB.");
          if (!["image/jpeg", "image/png"].includes(file.type)) throw new ApiError("Use a JPG or PNG image.");
          const result = await sql`update portal_products set image=${Buffer.from(await file.arrayBuffer())},image_type=${file.type},updated_at=now() where id=${id} and customer_id=${customer} returning id`;
          if (!result.length) throw new ApiError("Product not found.", 404);
          await audit(customer, "Product image updated", id);
          return Response.json({ ok: true });
        }
        if (method === "DELETE") {
          await sql`update portal_products set image=null,image_type=null,updated_at=now() where id=${id} and customer_id=${customer}`;
          return Response.json({ ok: true });
        }
      }
      if (method === "POST") {
        const { rows } = z
          .object({ rows: z.array(product).min(1).max(500) })
          .parse(await request.json());
        const ids = rows.flatMap(row => row.id ? [row.id] : []);
        const owned = ids.length ? await sql`select id from portal_products where customer_id=${customer} and id=any(${ids}::uuid[])` : [];
        if (owned.length !== new Set(ids).size) throw new ApiError("Product not found.", 404);
        await sql.transaction(
          rows.map((b) =>
            b.id
              ? sql`update portal_products set name=${b.name},sku=${b.sku},description=${b.description},category=${b.category},unit=${b.unit},price=${b.price},currency=${b.currency},stock=${b.stock},status=${b.status},updated_at=now() where id=${b.id} and customer_id=${customer}`
              : sql`insert into portal_products(customer_id,name,sku,description,category,unit,price,currency,stock,status) values(${customer},${b.name},${b.sku},${b.description},${b.category},${b.unit},${b.price},${b.currency},${b.stock},${b.status})`,
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
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
