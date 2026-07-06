import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { CustomerSubscription, SubscriptionPlan, UsageSummary } from './types'

type SqlClient = NeonQueryFunction<false, false>

type PlanRow = {
  id: string
  name: string
  monthly_price_cents: number
  token_limit: number
  call_limit: number
  is_active: boolean
}

type SubscriptionRow = {
  plan_id: string
  plan_name: string
  monthly_price_cents: number
  token_limit: number
  call_limit: number
  status: string
  current_period_start: Date
  current_period_end: Date
}

type UsageRow = {
  tokens_used: number
  calls_made: number
}

export const DEFAULT_PLAN_ID = 'starter'

const mockPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceCents: 0,
    tokenLimit: 100000,
    callLimit: 250,
    isActive: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPriceCents: 4900,
    tokenLimit: 500000,
    callLimit: 1000,
    isActive: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPriceCents: 14900,
    tokenLimit: 2000000,
    callLimit: 5000,
    isActive: true,
  },
]

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for billing data.')
  }

  return neon(process.env.DATABASE_URL)
}

function toPlan(row: PlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    monthlyPriceCents: row.monthly_price_cents,
    tokenLimit: row.token_limit,
    callLimit: row.call_limit,
    isActive: row.is_active,
  }
}

function toSubscription(row: SubscriptionRow): CustomerSubscription {
  return {
    planId: row.plan_id,
    planName: row.plan_name,
    monthlyPriceCents: row.monthly_price_cents,
    tokenLimit: row.token_limit,
    callLimit: row.call_limit,
    status: row.status,
    currentPeriodStart: row.current_period_start.toISOString(),
    currentPeriodEnd: row.current_period_end.toISOString(),
  }
}

export function currentBillingPeriod() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  return { start, end }
}

export async function ensureBillingSchema(sql: SqlClient = getSql()) {
  await sql`
    create table if not exists subscription_plans (
      id text primary key,
      name text not null,
      monthly_price_cents integer not null default 0,
      token_limit integer not null default 0,
      call_limit integer not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists customer_subscriptions (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid not null unique references customers(id) on delete cascade,
      plan_id text not null references subscription_plans(id),
      status text not null default 'active',
      current_period_start timestamptz not null default date_trunc('month', now()),
      current_period_end timestamptz not null default date_trunc('month', now()) + interval '1 month',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists usage_events (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid not null references customers(id) on delete cascade,
      event_type text not null,
      quantity integer not null default 0,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    insert into subscription_plans (id, name, monthly_price_cents, token_limit, call_limit)
    values
      ('starter', 'Starter', 0, 100000, 250),
      ('growth', 'Growth', 4900, 500000, 1000),
      ('scale', 'Scale', 14900, 2000000, 5000)
    on conflict (id) do update
    set
      name = excluded.name,
      monthly_price_cents = excluded.monthly_price_cents,
      token_limit = excluded.token_limit,
      call_limit = excluded.call_limit,
      is_active = true
  `

  await sql`
    insert into customer_subscriptions (customer_id, plan_id)
    select id, ${DEFAULT_PLAN_ID}
    from customers
    on conflict (customer_id) do nothing
  `
}

export async function listSubscriptionPlans(sql?: SqlClient) {
  if (!process.env.DATABASE_URL) {
    return mockPlans
  }

  const client = sql ?? getSql()

  await ensureBillingSchema(client)

  const rows = (await client`
    select id, name, monthly_price_cents, token_limit, call_limit, is_active
    from subscription_plans
    where is_active = true
    order by monthly_price_cents asc
  `) as PlanRow[]

  return rows.map(toPlan)
}

export async function getCustomerSubscription(customerId: string, sql: SqlClient = getSql()) {
  await ensureBillingSchema(sql)

  const rows = (await sql`
    select
      s.plan_id,
      p.name as plan_name,
      p.monthly_price_cents,
      p.token_limit,
      p.call_limit,
      s.status,
      s.current_period_start,
      s.current_period_end
    from customer_subscriptions s
    join subscription_plans p on p.id = s.plan_id
    where s.customer_id = ${customerId}
    limit 1
  `) as SubscriptionRow[]

  if (rows[0]) {
    return toSubscription(rows[0])
  }

  await setCustomerPlan(customerId, DEFAULT_PLAN_ID, sql)
  return getCustomerSubscription(customerId, sql)
}

export async function getCustomerUsage(
  customerId: string,
  subscription: CustomerSubscription,
  sql: SqlClient = getSql()
): Promise<UsageSummary> {
  await ensureBillingSchema(sql)

  const { start, end } = currentBillingPeriod()
  const rows = (await sql`
    select
      coalesce((
        select sum(quantity)::int
        from usage_events
        where customer_id = ${customerId}
          and event_type = 'tokens'
          and created_at >= ${start}
          and created_at < ${end}
      ), 0) as tokens_used,
      coalesce((
        select count(*)::int
        from calls
        where customer_id = ${customerId}
          and created_at >= ${start}
          and created_at < ${end}
      ), 0) as calls_made
  `) as UsageRow[]

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    tokensUsed: rows[0]?.tokens_used ?? 0,
    callsMade: rows[0]?.calls_made ?? 0,
    tokenLimit: subscription.tokenLimit,
    callLimit: subscription.callLimit,
  }
}

export async function getBillingSummary(customerId: string, sql: SqlClient = getSql()) {
  const subscription = await getCustomerSubscription(customerId, sql)
  const usage = await getCustomerUsage(customerId, subscription, sql)

  return { subscription, usage }
}

export async function setCustomerPlan(customerId: string, planId: string, sql?: SqlClient) {
  if (!process.env.DATABASE_URL) {
    return
  }

  const client = sql ?? getSql()

  await ensureBillingSchema(client)

  const plans = await client`
    select id
    from subscription_plans
    where id = ${planId} and is_active = true
    limit 1
  `

  if (!plans[0]) {
    throw new Error('Unknown subscription plan.')
  }

  const { start, end } = currentBillingPeriod()

  await client`
    insert into customer_subscriptions (
      customer_id,
      plan_id,
      current_period_start,
      current_period_end,
      updated_at
    )
    values (${customerId}, ${planId}, ${start}, ${end}, now())
    on conflict (customer_id) do update
    set
      plan_id = excluded.plan_id,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      updated_at = now()
  `
}
