import { getAuth } from '@/lib/auth/server'

type AuthContext = {
  params: Promise<{ path: string[] }>
}

function authUnavailable() {
  return Response.json(
    {
      error:
        'Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.',
    },
    { status: 503 }
  )
}

export async function GET(request: Request, context: AuthContext) {
  const auth = getAuth()
  return auth ? auth.handler().GET(request, context) : authUnavailable()
}

export async function POST(request: Request, context: AuthContext) {
  const auth = getAuth()
  return auth ? auth.handler().POST(request, context) : authUnavailable()
}

export async function PUT(request: Request, context: AuthContext) {
  const auth = getAuth()
  return auth ? auth.handler().PUT(request, context) : authUnavailable()
}

export async function PATCH(request: Request, context: AuthContext) {
  const auth = getAuth()
  return auth ? auth.handler().PATCH(request, context) : authUnavailable()
}

export async function DELETE(request: Request, context: AuthContext) {
  const auth = getAuth()
  return auth ? auth.handler().DELETE(request, context) : authUnavailable()
}
