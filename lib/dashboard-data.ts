import { neon } from '@neondatabase/serverless'
import { buildDashboardData, mockDashboardData } from './mock-data'
import type { AgentConfig, CallRecord, Customer, WhatsAppNumber } from './types'

type CustomerRow = {
  id: string
  auth_user_id: string | null
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  created_at: Date
}

type WhatsAppNumberRow = {
  id: string
  customer_id: string
  phone_number: string
  phone_number_id: string | null
  waba_id: string | null
  status: string
  created_at: Date
}

type AgentConfigRow = {
  id: string
  customer_id: string
  name: string
  languages: string[]
  system_prompt: string | null
  created_at: Date
}

type CallRow = {
  id: string
  customer_id: string
  whatsapp_number_id: string | null
  customer_phone: string | null
  status: string
  transcript: string | null
  recording_url: string | null
  created_at: Date
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    businessName: row.business_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at.toISOString(),
  }
}

function toWhatsAppNumber(row: WhatsAppNumberRow): WhatsAppNumber {
  return {
    id: row.id,
    customerId: row.customer_id,
    phoneNumber: row.phone_number,
    phoneNumberId: row.phone_number_id,
    wabaId: row.waba_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }
}

function toAgentConfig(row: AgentConfigRow): AgentConfig {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    languages: row.languages,
    systemPrompt: row.system_prompt,
    createdAt: row.created_at.toISOString(),
  }
}

function toCall(row: CallRow): CallRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    whatsappNumberId: row.whatsapp_number_id,
    customerPhone: row.customer_phone,
    status: row.status,
    transcript: row.transcript,
    recordingUrl: row.recording_url,
    createdAt: row.created_at.toISOString(),
  }
}

export async function getDashboardData(authUserId?: string) {
  const databaseUrl = getDatabaseUrl()

  if (!databaseUrl) {
    return mockDashboardData
  }

  try {
    const sql = neon(databaseUrl)
    const customers = authUserId
      ? ((await sql`
          select id, auth_user_id, business_name, contact_name, email, phone, created_at
          from customers
          where auth_user_id = ${authUserId}
          limit 1
        `) as CustomerRow[])
      : ((await sql`
          select id, auth_user_id, business_name, contact_name, email, phone, created_at
          from customers
          order by created_at asc
          limit 1
        `) as CustomerRow[])

    if (!customers[0]) {
      return null
    }

    const customer = toCustomer(customers[0])

    const [numbers, agents, calls] = await Promise.all([
      sql`
        select id, customer_id, phone_number, phone_number_id, waba_id, status, created_at
        from whatsapp_numbers
        where customer_id = ${customer.id}
        order by created_at desc
        limit 1
      `,
      sql`
        select id, customer_id, name, languages, system_prompt, created_at
        from agent_configs
        where customer_id = ${customer.id}
        order by created_at desc
        limit 1
      `,
      sql`
        select id, customer_id, whatsapp_number_id, customer_phone, status, transcript, recording_url, created_at
        from calls
        where customer_id = ${customer.id}
        order by created_at desc
        limit 25
      `,
    ])

    return buildDashboardData(
      customer,
      (numbers as WhatsAppNumberRow[])[0] ? toWhatsAppNumber((numbers as WhatsAppNumberRow[])[0]) : null,
      (agents as AgentConfigRow[])[0] ? toAgentConfig((agents as AgentConfigRow[])[0]) : null,
      (calls as CallRow[]).map(toCall),
      'neon'
    )
  } catch (error) {
    console.error('Failed to load Neon dashboard data:', error)
    return mockDashboardData
  }
}
