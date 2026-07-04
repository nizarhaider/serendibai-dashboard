import { createNeonAuth, type NeonAuth } from '@neondatabase/auth/next/server'

let authInstance: NeonAuth | null = null

export function isAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET)
}

export function getAuth() {
  if (!isAuthConfigured()) {
    return null
  }

  if (!authInstance) {
    authInstance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
        sessionDataTtl: 300,
      },
    })
  }

  return authInstance
}
