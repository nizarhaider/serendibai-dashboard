'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentAdminUser, getSql } from '@/lib/admin-data'
import { getAuth } from '@/lib/auth/server'

async function requireAdmin() {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'admin') {
    throw new Error('You do not have permission to manage users.')
  }

  return user
}

async function getResetRedirectUrl() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin') ?? 'http://localhost:3001'
  return `${origin}/reset-password`
}

function fallbackBusinessName(email: string) {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ') || email
}

export async function createCustomerUserAction(formData: FormData) {
  await requireAdmin()

  const auth = getAuth()

  if (!auth) {
    redirect('/admin?message=auth-missing')
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const businessName = String(formData.get('businessName') ?? '').trim()

  if (!email) {
    redirect('/admin?message=email-required')
  }

  const displayName = name || businessName || fallbackBusinessName(email)
  const createResult = await auth.admin.createUser({
    email,
    name: displayName,
    role: 'user',
  })

  const sql = getSql()
  let userId = createResult.data?.user?.id

  if (createResult.error) {
    const existingUsers = await sql`
      select id
      from neon_auth."user"
      where email = ${email}
      limit 1
    `

    if (!existingUsers[0]) {
      redirect('/admin?message=create-failed')
    }

    userId = existingUsers[0].id as string
  }

  if (!userId) {
    redirect('/admin?message=create-failed')
  }

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

  const resetResult = await auth.requestPasswordReset({
    email,
    redirectTo: await getResetRedirectUrl(),
  })

  revalidatePath('/admin')

  if (resetResult.error) {
    redirect('/admin?message=reset-failed')
  }

  redirect('/admin?message=user-created')
}

export async function resendPasswordResetAction(formData: FormData) {
  await requireAdmin()

  const auth = getAuth()

  if (!auth) {
    redirect('/admin?message=auth-missing')
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (email) {
    await auth!.requestPasswordReset({
      email,
      redirectTo: await getResetRedirectUrl(),
    })
  }

  redirect('/admin?message=reset-sent')
}
