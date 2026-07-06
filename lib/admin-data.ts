import { neon } from '@neondatabase/serverless'
import { currentBillingPeriod, ensureBillingSchema } from '@/lib/billing-data'
import { getAuth } from '@/lib/auth/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'

export type AdminUser = {
  id: string
  email: string
  name: string
  role: string | null
  customerId: string | null
  businessName: string | null
  hasPassword: boolean
  planId: string | null
  planName: string | null
  tokensUsed: number
  callsMade: number
  createdAt: string
}

type AuthUserRow = {
  id: string
  email: string
  name: string
  role: string | null
}

type AdminUserRow = {
  id: string
  email: string
  name: string
  role: string | null
  customer_id: string | null
  business_name: string | null
  has_password: boolean | null
  plan_id: string | null
  plan_name: string | null
  tokens_used: number | null
  calls_made: number | null
  created_at: Date
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for admin user management.')
  }

  return neon(process.env.DATABASE_URL)
}

export async function getCurrentAdminUser() {
  const auth = getAuth()

  if (!auth) {
    return null
  }

  const session = await getSessionFromAuthRoute()
  const authUserId = session?.user?.id

  if (!authUserId) {
    return null
  }

  const sql = getSql()
  const users = (await sql`
    select id, email, name, role
    from neon_auth."user"
    where id = ${authUserId}
    limit 1
  `) as AuthUserRow[]

  return users[0] ?? null
}

export async function listAdminUsers() {
  const sql = getSql()
  await ensureBillingSchema(sql)
  const { start, end } = currentBillingPeriod()

  const rows = (await sql`
    select
      u.id,
      u.email,
      u.name,
      u.role,
      c.id as customer_id,
      c.business_name,
      bool_or(a.password is not null) as has_password,
      s.plan_id,
      p.name as plan_name,
      coalesce(usage.tokens_used, 0)::int as tokens_used,
      coalesce(calls.calls_made, 0)::int as calls_made,
      u."createdAt" as created_at
    from neon_auth."user" u
    left join neon_auth.account a on a."userId" = u.id
    left join customers c on c.auth_user_id = u.id::text
    left join customer_subscriptions s on s.customer_id = c.id
    left join subscription_plans p on p.id = s.plan_id
    left join lateral (
      select sum(quantity)::int as tokens_used
      from usage_events
      where customer_id = c.id
        and event_type = 'tokens'
        and created_at >= ${start}
        and created_at < ${end}
    ) usage on true
    left join lateral (
      select count(*)::int as calls_made
      from calls
      where customer_id = c.id
        and created_at >= ${start}
        and created_at < ${end}
    ) calls on true
    group by
      u.id,
      u.email,
      u.name,
      u.role,
      c.id,
      c.business_name,
      s.plan_id,
      p.name,
      usage.tokens_used,
      calls.calls_made,
      u."createdAt"
    order by u."createdAt" desc
  `) as AdminUserRow[]

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    customerId: row.customer_id,
    businessName: row.business_name,
    hasPassword: Boolean(row.has_password),
    planId: row.plan_id,
    planName: row.plan_name,
    tokensUsed: row.tokens_used ?? 0,
    callsMade: row.calls_made ?? 0,
    createdAt: row.created_at.toISOString(),
  }))
}
