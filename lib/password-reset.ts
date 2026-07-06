import { getAuth } from '@/lib/auth/server'

export function getPasswordResetUrl(origin: string) {
  return new URL('/reset-password', origin).toString()
}

export async function requestPasswordResetEmail(email: string, origin: string) {
  const auth = getAuth()

  if (!auth) {
    return { error: 'Neon Auth is not configured.' }
  }

  return auth.requestPasswordReset({
    email,
    redirectTo: getPasswordResetUrl(origin),
  })
}
