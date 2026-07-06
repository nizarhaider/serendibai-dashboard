import { getCurrentAdminUser, getSql } from '@/lib/admin-data'
import { isAuthConfigured } from '@/lib/auth/server'
import { getPasswordResetUrl } from '@/lib/password-reset'

export type AdminMutationResult =
  | { ok: true; message: 'user-created' | 'reset-sent' }
  | {
      ok: false
      message: 'auth-missing' | 'email-required' | 'create-failed' | 'reset-failed' | 'forbidden'
    }

function fallbackBusinessName(email: string) {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ') || email
}

async function isAdmin() {
  const user = await getCurrentAdminUser()
  return user?.role === 'admin'
}

async function postAuthApi<T>(
  path: string,
  body: Record<string, unknown>,
  origin: string,
  cookieHeader: string
) {
  const response = await fetch(`${origin}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  const data = text ? (JSON.parse(text) as T) : ({} as T)

  return { response, data }
}

export async function createCustomerUser(formData: FormData, origin: string, cookieHeader: string) {
  if (!(await isAdmin())) {
    return { ok: false, message: 'forbidden' } satisfies AdminMutationResult
  }

  if (!isAuthConfigured()) {
    return { ok: false, message: 'auth-missing' } satisfies AdminMutationResult
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const businessName = String(formData.get('businessName') ?? '').trim()

  if (!email) {
    return { ok: false, message: 'email-required' } satisfies AdminMutationResult
  }

  const displayName = name || businessName || fallbackBusinessName(email)
  const createResult = await postAuthApi<{ user?: { id: string }; message?: string }>(
    'admin/create-user',
    { email, name: displayName, role: 'user' },
    origin,
    cookieHeader
  )

  const sql = getSql()
  let userId = createResult.data.user?.id

  if (!createResult.response.ok) {
    const existingUsers = await sql`
      select id
      from neon_auth."user"
      where email = ${email}
      limit 1
    `

    if (!existingUsers[0]) {
      return { ok: false, message: 'create-failed' } satisfies AdminMutationResult
    }

    userId = existingUsers[0].id as string
  }

  if (!userId) {
    return { ok: false, message: 'create-failed' } satisfies AdminMutationResult
  }

  await sql`
    update neon_auth."user"
    set "emailVerified" = true, "updatedAt" = now()
    where id = ${userId}
  `

  const customerName = businessName || displayName
  const updated = await sql`
    update customers
    set auth_user_id = ${userId}, contact_name = ${displayName}, email = ${email}
    where email = ${email} or auth_user_id = ${userId}
    returning id
  `

  if (!updated[0]) {
    await sql`
      insert into customers (business_name, contact_name, email, auth_user_id)
      values (${customerName}, ${displayName}, ${email}, ${userId})
    `
  }

  const resetResult = await postAuthApi<{ status?: boolean; message?: string }>(
    'request-password-reset',
    { email, redirectTo: getPasswordResetUrl(origin), callbackURL: getPasswordResetUrl(origin) },
    origin,
    cookieHeader
  )

  if (!resetResult.response.ok) {
    return { ok: false, message: 'reset-failed' } satisfies AdminMutationResult
  }

  return { ok: true, message: 'user-created' } satisfies AdminMutationResult
}

export async function resendPasswordReset(formData: FormData, origin: string, cookieHeader: string) {
  if (!(await isAdmin())) {
    return { ok: false, message: 'forbidden' } satisfies AdminMutationResult
  }

  if (!isAuthConfigured()) {
    return { ok: false, message: 'auth-missing' } satisfies AdminMutationResult
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email) {
    return { ok: false, message: 'email-required' } satisfies AdminMutationResult
  }

  const resetResult = await postAuthApi<{ status?: boolean; message?: string }>(
    'request-password-reset',
    { email, redirectTo: getPasswordResetUrl(origin), callbackURL: getPasswordResetUrl(origin) },
    origin,
    cookieHeader
  )

  if (!resetResult.response.ok) {
    return { ok: false, message: 'reset-failed' } satisfies AdminMutationResult
  }

  return { ok: true, message: 'reset-sent' } satisfies AdminMutationResult
}
