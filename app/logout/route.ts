import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'

export async function POST(request: Request) {
  const auth = getAuth()

  if (auth) {
    await auth.signOut()
  }

  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
