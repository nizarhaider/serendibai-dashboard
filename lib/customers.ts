import { db } from "./db";

export async function getCustomers() {
  return db()`select c.id,c.business_name,c.contact_name,c.portal_read_only as read_only,c.portal_tools as allowed_tools,
    (select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'name',u.display_name,'is_admin',u.is_admin,'invitation_pending',exists(select 1 from portal_invitations i where i.user_id=u.id),'invitation_sent',exists(select 1 from portal_invitations i where i.user_id=u.id and i.sent_at is not null))),'[]') from portal_users u where u.customer_id=c.id) as users,
    (select count(*)::int from portal_agents a where a.customer_id=c.id and a.status<>'archived') as agents,
    (select count(*)::int from portal_calls p where p.customer_id=c.id) as calls
    from customers c where not exists(select 1 from portal_users u where u.customer_id=c.id and u.is_admin) order by c.business_name`;
}
