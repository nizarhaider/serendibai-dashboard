import { db } from "./db";

export async function getCustomers() {
  return db()`select c.id,c.business_name,c.contact_name,c.portal_read_only as read_only,c.portal_tools as allowed_tools,
    (select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'name',u.display_name,'is_admin',u.is_admin,'invitation_pending',exists(select 1 from portal_invitations i where i.user_id=u.id),'invitation_sent',exists(select 1 from portal_invitations i where i.user_id=u.id and i.sent_at is not null))),'[]') from portal_users u where u.customer_id=c.id) as users,
    (select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'phone',l.phone,'status',l.status,'enabled',l.enabled,'error',l.error,'agent_name',a.name) order by l.updated_at desc),'[]') from portal_whatsapp_links l left join portal_agents a on a.id=l.agent_id where l.customer_id=c.id) as connections,
    (select count(*)::int from portal_agents a where a.customer_id=c.id and a.status<>'archived') as agents,
    (select count(*)::int from portal_calls p where p.customer_id=c.id) as calls,
    (select coalesce(round(sum(p.duration_seconds)::numeric / 60, 1), 0)::float from portal_calls p where p.customer_id=c.id) as call_minutes,
    (select coalesce(jsonb_object_agg(model, totals), '{}'::jsonb) from (
      select model, jsonb_build_object(
        'request_count', sum((bucket->>'request_count')::int),
        'total_tokens', sum((bucket->>'total_tokens')::bigint),
        'input_tokens', sum((bucket->>'input_tokens')::bigint),
        'output_tokens', sum((bucket->>'output_tokens')::bigint),
        'audio_seconds', sum((bucket->>'audio_seconds')::numeric)
      ) as totals
      from (
        select p.customer_id, model_usage.model, model_usage.bucket
        from portal_calls p
        cross join lateral jsonb_each(coalesce(p.usage->'models', '{}'::jsonb)) as model_usage(model, bucket)
        union all
        select p.customer_id, 'gemini-3.8-live', jsonb_build_object(
          'request_count', jsonb_array_length(coalesce(p.usage->'requests', '[]'::jsonb)),
          'total_tokens', coalesce((select sum((request->>'total_token_count')::bigint) from jsonb_array_elements(coalesce(p.usage->'requests', '[]'::jsonb)) request), 0),
          'input_tokens', coalesce((select sum((request->>'prompt_token_count')::bigint) from jsonb_array_elements(coalesce(p.usage->'requests', '[]'::jsonb)) request), 0),
          'output_tokens', coalesce((select sum((request->>'response_token_count')::bigint) from jsonb_array_elements(coalesce(p.usage->'requests', '[]'::jsonb)) request), 0),
          'audio_seconds', 0
        )
        from portal_calls p where p.customer_id=c.id and p.usage->>'provider'='google_gemini_live'
      ) model_usage
      where model_usage.customer_id=c.id group by model
    ) usage_by_model) as model_usage
    from customers c where not exists(select 1 from portal_users u where u.customer_id=c.id and u.is_admin) order by c.business_name`;
}
