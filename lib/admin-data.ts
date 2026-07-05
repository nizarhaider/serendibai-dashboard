import { neon } from '@neondatabase/serverless'
import { getAuth } from '@/lib/auth/server'

export type AdminUser = {
  id: string
  email: string
  name: string
  role: string | null
  customerId: string | null
  businessName: string | null
  hasPassword: boolean
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

  const session = await auth.getSession()
  const authUserId = session.data?.user?.id

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
  const rows = (await sql`
    select
      u.id,
      u.email,
      u.name,
      u.role,
      c.id as customer_id,
      c.business_name,
      bool_or(a.password is not null) as has_password,
      u."createdAt" as created_at
    from neon_auth."user" u
    left join neon_auth.account a on a."userId" = u.id
    left join customers c on c.auth_user_id = u.id::text
    group by u.id, u.email, u.name, u.role, c.id, c.business_name, u."createdAt"
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
    createdAt: row.created_at.toISOString(),
  }))
}
