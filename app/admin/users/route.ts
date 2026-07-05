import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createCustomerUser } from '@/lib/admin-user-management'

export async function POST(request: Request) {
  const result = await createCustomerUser(
    await request.formData(),
    new URL(request.url).origin,
    request.headers.get('cookie') ?? ''
  )

  revalidatePath('/admin')

  return NextResponse.redirect(new URL(`/admin?message=${result.message}`, request.url), {
    status: 303,
  })
}
