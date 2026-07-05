import { NextResponse, type NextRequest } from 'next/server'
import { getAuth, isAuthConfigured } from '@/lib/auth/server'

export default function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin')
    ) {
      return NextResponse.redirect(new URL('/login?setup=missing', request.url))
    }

    return NextResponse.next()
  }

  const auth = getAuth()
  return auth!.middleware({ loginUrl: '/login' })(request)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
