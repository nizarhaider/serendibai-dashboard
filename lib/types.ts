export type Customer = {
  id: string
  businessName: string
  contactName: string | null
  email: string | null
  phone: string | null
  createdAt: string
}

export type WhatsAppNumber = {
  id: string
  customerId: string
  phoneNumber: string
  phoneNumberId: string | null
  wabaId: string | null
  status: string
  createdAt: string
}

export type AgentConfig = {
  id: string
  customerId: string
  name: string
  languages: string[]
  systemPrompt: string | null
  createdAt: string
}

export type CallRecord = {
  id: string
  customerId: string
  whatsappNumberId: string | null
  customerPhone: string | null
  status: string
  transcript: string | null
  recordingUrl: string | null
  createdAt: string
}

export type DailyCallCount = {
  date: string
  calls: number
}

export type DashboardData = {
  customer: Customer
  whatsappNumber: WhatsAppNumber | null
  agentConfig: AgentConfig | null
  calls: CallRecord[]
  dailyCalls: DailyCallCount[]
  stats: {
    totalCalls: number
    completedCalls: number
    escalatedCalls: number
    recordingsAvailable: number
  }
  dataSource: 'neon' | 'mock'
}
