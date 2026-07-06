import { neon } from '@neondatabase/serverless'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'
import { setCustomerPlan } from '@/lib/billing-data'

type CustomerIdRow = {
  id: string
}

export async function POST(request: Request) {
  const session = await getSessionFromAuthRoute()
  const userId = session?.user?.id

  if (!userId || !process.env.DATABASE_URL) {
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  }

  const formData = await request.formData()
  const planId = String(formData.get('planId') ?? '')
  const sql = neon(process.env.DATABASE_URL)
  const customers = (await sql`
    select id
    from customers
    where auth_user_id = ${userId}
    limit 1
  `) as CustomerIdRow[]

  if (customers[0] && planId) {
    await setCustomerPlan(customers[0].id, planId, sql)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
  }

  return NextResponse.redirect(new URL('/dashboard/settings', request.url), { status: 303 })
}
