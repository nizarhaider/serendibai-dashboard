import { headers } from 'next/headers'

type AuthSessionUser = {
  id: string
  email?: string | null
  name?: string | null
}

type AuthSessionData = {
  user: AuthSessionUser | null
  session: unknown | null
}

function getOrigin(headersList: Headers) {
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    return null
  }

  return `${protocol}://${host}`
}

export async function getSessionFromAuthRoute() {
  const headersList = await headers()
  const origin = getOrigin(headersList)

  if (!origin) {
    return null
  }

  const response = await fetch(new URL('/api/auth/get-session', origin), {
    headers: {
      cookie: headersList.get('cookie') ?? '',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as AuthSessionData

  return data.user ? data : null
}
