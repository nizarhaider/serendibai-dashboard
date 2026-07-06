'use server'

import { redirect } from 'next/navigation'
import { getSql } from '@/lib/admin-data'
import { getAuth } from '@/lib/auth/server'

export type LoginState = {
  error?: string
}

export async function signInAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const auth = getAuth()

  if (!auth) {
    return {
      error:
        'Neon Auth is not configured yet. Add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.',
    }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter both email and password.' }
  }

  const { error } = await auth.signIn.email({
    email,
    password,
  })

  if (error) {
    return { error: error.message || 'Could not sign in with those credentials.' }
  }

  let redirectTo = '/dashboard'

  if (process.env.DATABASE_URL) {
    const sql = getSql()
    const users = await sql`
      select role
      from neon_auth."user"
      where email = ${email}
      limit 1
    `

    if (users[0]?.role === 'admin') {
      redirectTo = '/admin'
    }
  }

  redirect(redirectTo)
}
