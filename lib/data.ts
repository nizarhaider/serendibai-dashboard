import { db } from "./db";
import type { PortalData } from "./types";

export async function getData(
  customer: string,
  email: string,
  days = 30,
  agent?: string,
  section = "dashboard",
): Promise<PortalData> {
  const sql = db();
  const [account] = await sql`select c.business_name,u.display_name,u.is_admin,c.portal_read_only as read_only,c.portal_tools as allowed_tools from customers c join portal_users u on u.customer_id=c.id where c.id=${customer} and u.email=${email}`;
  if (!account) throw new Error("Workspace not found.");
  const editable = !account.read_only;
  const dashboard = section === "dashboard";
  const allowed = (name: string, tool: string) => editable && section === name && account.allowed_tools.includes(tool);
  const [agents, documents, products, calls, appointments, orders, tickets, totals, attention] =
    await Promise.all([
      sql`select id,name,company_name,company_url,case when ${editable && section === "agents"} then system_prompt else '' end as system_prompt,voice,languages,tools,max_calls,case when ${editable && section === "agents"} then phone_number_id else '' end as phone_number_id,status,version,deployed_version,heartbeat_at,case when ${editable && section === "agents"} then telemetry else '{}'::jsonb end as telemetry,(${editable && section === "agents"} and (credentials is not null or phone_number_id=${process.env.PHONE_NUMBER_ID || ""})) as has_credentials,created_at from portal_agents where customer_id=${customer} and (${dashboard} or status<>'archived') order by (status='archived'),created_at desc`,
      editable && section === "knowledge" ? sql`select id,name,bytes,type,created_at,length(content) as characters from portal_documents where customer_id=${customer} order by created_at desc` : [],
      editable && section === "catalogue" ? sql`select id,name,sku,description,category,price,currency,stock,status from portal_products where customer_id=${customer} order by updated_at desc limit 2000` : [],
      dashboard ? sql`select c.id,c.agent_id,a.name as agent_name,c.customer_phone,c.status,c.transcript,c.duration_seconds,c.tokens,c.created_at,c.source from portal_calls c left join portal_agents a on a.id=c.agent_id where c.customer_id=${customer} and (${agent || null}::uuid is null or c.agent_id=${agent || null}::uuid) and c.created_at>=((now() at time zone 'Asia/Colombo')::date-(${days}-1))::timestamp at time zone 'Asia/Colombo' order by c.created_at desc limit 100` : [],
      allowed("appointments", "book_appointment") ? sql`select p.id,p.agent_id,a.name as agent_name,p.call_id,p.customer_phone,p.customer_name,p.service,p.appointment_at,p.duration_minutes,p.notes,p.status,p.created_at from portal_appointments p left join portal_agents a on a.id=p.agent_id where p.customer_id=${customer} order by p.appointment_at limit 2000` : [],
      allowed("orders", "create_order") ? sql`select o.id,o.agent_id,a.name as agent_name,o.call_id,o.customer_phone,o.customer_name,o.items,o.delivery_address,o.notes,o.status,o.created_at from portal_orders o left join portal_agents a on a.id=o.agent_id where o.customer_id=${customer} order by o.created_at desc limit 2000` : [],
      allowed("tickets", "create_ticket") ? sql`select t.id,t.agent_id,a.name as agent_name,t.call_id,t.customer_phone,t.customer_name,t.subject,t.description,t.priority,t.status,t.created_at from portal_tickets t left join portal_agents a on a.id=t.agent_id where t.customer_id=${customer} order by t.created_at desc limit 2000` : [],
      dashboard ? sql`select count(*)::int as calls,count(*) filter(where status in ('completed','ended','active'))::int as answered,round(sum(duration_seconds)/60,2)::float as minutes from portal_calls where customer_id=${customer} and (${agent || null}::uuid is null or agent_id=${agent || null}::uuid) and created_at>=((now() at time zone 'Asia/Colombo')::date-(${days}-1))::timestamp at time zone 'Asia/Colombo'` : [],
      editable && dashboard ? sql`select
        (select count(*)::int from portal_tickets where customer_id=${customer} and status in ('open','in_progress') and ${account.allowed_tools.includes("create_ticket")}) as tickets,
        (select count(*)::int from portal_orders where customer_id=${customer} and status in ('placed','processing') and ${account.allowed_tools.includes("create_order")}) as orders,
        (select count(*)::int from portal_appointments where customer_id=${customer} and status='booked' and appointment_at>=now() and ${account.allowed_tools.includes("book_appointment")}) as appointments` : [],
    ]);
  return JSON.parse(
    JSON.stringify({
      generatedAt: Date.now(),
      ...account,
      email,
      agents,
      documents,
      products,
      calls,
      appointments,
      orders,
      tickets,
      totals: totals[0] || { calls: 0, answered: 0, minutes: null },
      attention: attention[0] || { tickets: 0, orders: 0, appointments: 0 },
    }),
  );
}
