import { db } from "./db";

export async function getCustomers() {
  return db()`select c.id,c.business_name,c.contact_name,c.portal_read_only as read_only,c.portal_tools as allowed_tools,
    (select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'name',u.display_name,'is_admin',u.is_admin)),'[]') from portal_users u where u.customer_id=c.id) as users,
    (select count(*)::int from portal_agents a where a.customer_id=c.id and a.status<>'archived') as agents,
    (select count(*)::int from portal_calls p where p.customer_id=c.id) as calls
    from customers c where exists(select 1 from portal_users u where u.customer_id=c.id) order by c.business_name`;
}
