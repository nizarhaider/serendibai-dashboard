import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/admin-data'
import { setCustomerPlan } from '@/lib/billing-data'

type RouteContext = {
  params: Promise<{ customerId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const adminUser = await getCurrentAdminUser()

  if (adminUser?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  }

  const { customerId } = await context.params
  const formData = await request.formData()
  const planId = String(formData.get('planId') ?? '')

  if (customerId && planId) {
    await setCustomerPlan(customerId, planId)
    revalidatePath('/admin')
    revalidatePath(`/admin/customers/${customerId}`)
  }

  return NextResponse.redirect(new URL(`/admin/customers/${customerId}`, request.url), {
    status: 303,
  })
}
