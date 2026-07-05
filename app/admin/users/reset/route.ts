import { NextResponse } from 'next/server'
import { resendPasswordReset } from '@/lib/admin-user-management'

export async function POST(request: Request) {
  const result = await resendPasswordReset(
    await request.formData(),
    new URL(request.url).origin,
    request.headers.get('cookie') ?? ''
  )

  return NextResponse.redirect(new URL(`/admin?message=${result.message}`, request.url), {
    status: 303,
  })
}
