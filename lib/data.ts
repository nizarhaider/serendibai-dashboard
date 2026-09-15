import { db } from "./db";
import type { PortalData } from "./types";

export async function getData(
  customer: string,
  email: string,
  days = 30,
  agent?: string,
): Promise<PortalData> {
  const sql = db();
  const [agents, documents, products, calls, daily, totals, quotas, events] =
    await Promise.all([
      sql`select id,name,company_url,system_prompt,greeting,voice,languages,tools,max_calls,hourly_budget,phone_number_id,instance_id,status,version,deployed_version,heartbeat_at,telemetry,(credentials is not null or phone_number_id=${process.env.PHONE_NUMBER_ID || ""}) as has_credentials,created_at from portal_agents where customer_id=${customer} order by created_at`,
      sql`select id,name,bytes,type,created_at,length(content) as characters from portal_documents where customer_id=${customer} order by created_at desc`,
      sql`select id,name,sku,description,category,price,currency,stock,status from portal_products where customer_id=${customer} order by updated_at desc limit 2000`,
      sql`select c.id,c.agent_id,a.name as agent_name,c.customer_phone,c.status,c.transcript,c.duration_seconds,c.tokens,c.created_at,c.source from portal_calls c left join portal_agents a on a.id=c.agent_id where c.customer_id=${customer} and (${agent || null}::uuid is null or c.agent_id=${agent || null}::uuid) and c.created_at>=current_date-(${days}-1)*interval '1 day' order by c.created_at desc limit 100`,
      sql`select d::date::text as date,count(c.id)::int as calls,round(sum(c.duration_seconds)/60,2)::float as minutes,sum(c.tokens)::int as tokens from generate_series(current_date-(${days}-1)*interval '1 day',current_date,interval '1 day') d left join portal_calls c on c.created_at>=d and c.created_at<d+interval '1 day' and c.customer_id=${customer} and (${agent || null}::uuid is null or c.agent_id=${agent || null}::uuid) group by d order by d`,
      sql`select count(*)::int as calls,count(*) filter(where status in ('completed','ended','active'))::int as answered,round(sum(duration_seconds)/60,2)::float as minutes,sum(tokens)::int as tokens,count(duration_seconds)::int as measured_minutes,count(tokens)::int as measured_tokens from portal_calls where customer_id=${customer} and (${agent || null}::uuid is null or agent_id=${agent || null}::uuid) and created_at>=current_date-(${days}-1)*interval '1 day'`,
      sql`select tokens,minutes,calls,label from portal_quotas where customer_id=${customer}`,
      sql`select id,action,detail,created_at from portal_events where customer_id=${customer} order by created_at desc limit 15`,
    ]);
  return JSON.parse(
    JSON.stringify({
      generatedAt: Date.now(),
      email,
      agents,
      documents,
      products,
      calls,
      daily,
      totals: totals[0],
      quotas: quotas[0],
      events,
    }),
  );
}
