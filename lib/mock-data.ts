import type {
  AgentConfig,
  CallRecord,
  Customer,
  CustomerSubscription,
  DashboardData,
  UsageSummary,
  WhatsAppNumber,
} from './types'

const customer: Customer = {
  id: 'demo-customer',
  authUserId: null,
  businessName: 'Colombo Care Clinic',
  contactName: 'Nimali Perera',
  email: 'ops@colombocare.example',
  phone: '+94 77 530 7008',
  createdAt: '2026-07-01T08:00:00.000Z',
}

const whatsappNumber: WhatsAppNumber = {
  id: 'demo-whatsapp-number',
  customerId: customer.id,
  phoneNumber: '+94 74 253 0708',
  phoneNumberId: '123456789012345',
  wabaId: '987654321098765',
  status: 'active',
  createdAt: '2026-07-01T08:10:00.000Z',
}

const agentConfig: AgentConfig = {
  id: 'demo-agent',
  customerId: customer.id,
  name: 'Front Desk Agent',
  languages: ['en', 'si', 'ta'],
  systemPrompt:
    'Answer inbound clinic calls, collect booking details, summarize the call, and escalate payment or urgent medical questions to staff.',
  createdAt: '2026-07-01T08:20:00.000Z',
}

const calls: CallRecord[] = [
  {
    id: 'call-1008',
    customerId: customer.id,
    whatsappNumberId: whatsappNumber.id,
    customerPhone: '+94 77 120 8841',
    status: 'completed',
    transcript:
      'Customer asked in Sinhala to book a consultation tomorrow morning. Agent collected name, preferred time, and phone number.',
    recordingUrl: 'https://example.com/recordings/call-1008.wav',
    createdAt: '2026-07-05T03:42:00.000Z',
  },
  {
    id: 'call-1007',
    customerId: customer.id,
    whatsappNumberId: whatsappNumber.id,
    customerPhone: '+94 76 221 5510',
    status: 'escalated',
    transcript:
      'Customer asked about a billing issue. Agent summarized the problem and handed off to the clinic admin team.',
    recordingUrl: 'https://example.com/recordings/call-1007.wav',
    createdAt: '2026-07-05T02:18:00.000Z',
  },
  {
    id: 'call-1006',
    customerId: customer.id,
    whatsappNumberId: whatsappNumber.id,
    customerPhone: '+94 75 441 0029',
    status: 'completed',
    transcript:
      'Tamil-speaking customer asked for opening hours and appointment availability. Agent confirmed weekend hours.',
    recordingUrl: null,
    createdAt: '2026-07-04T11:06:00.000Z',
  },
  {
    id: 'call-1005',
    customerId: customer.id,
    whatsappNumberId: whatsappNumber.id,
    customerPhone: '+94 71 330 4602',
    status: 'completed',
    transcript:
      'Customer asked in English whether lab reports can be collected after 5 PM. Agent answered and confirmed location.',
    recordingUrl: 'https://example.com/recordings/call-1005.wav',
    createdAt: '2026-07-04T06:36:00.000Z',
  },
  {
    id: 'call-1004',
    customerId: customer.id,
    whatsappNumberId: whatsappNumber.id,
    customerPhone: '+94 78 900 1544',
    status: 'missed',
    transcript: null,
    recordingUrl: null,
    createdAt: '2026-07-03T12:08:00.000Z',
  },
]

const subscription: CustomerSubscription = {
  planId: 'growth',
  planName: 'Growth',
  monthlyPriceCents: 4900,
  tokenLimit: 500000,
  callLimit: 1000,
  status: 'active',
  currentPeriodStart: '2026-07-01T00:00:00.000Z',
  currentPeriodEnd: '2026-08-01T00:00:00.000Z',
}

export function buildDashboardData(
  sourceCustomer = customer,
  sourceWhatsAppNumber: WhatsAppNumber | null = whatsappNumber,
  sourceAgentConfig: AgentConfig | null = agentConfig,
  sourceCalls = calls,
  dataSource: DashboardData['dataSource'] = 'mock',
  sourceSubscription: CustomerSubscription = subscription,
  sourceUsage?: UsageSummary
): DashboardData {
  const sortedCalls = [...sourceCalls].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
  const countsByDate = sortedCalls.reduce<Record<string, number>>((acc, call) => {
    const label = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Colombo',
    }).format(new Date(call.createdAt))
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})

  const usage = sourceUsage ?? {
    periodStart: sourceSubscription.currentPeriodStart,
    periodEnd: sourceSubscription.currentPeriodEnd,
    tokensUsed: 183400,
    callsMade: sortedCalls.length,
    tokenLimit: sourceSubscription.tokenLimit,
    callLimit: sourceSubscription.callLimit,
  }

  return {
    customer: sourceCustomer,
    whatsappNumber: sourceWhatsAppNumber,
    agentConfig: sourceAgentConfig,
    calls: sortedCalls,
    dailyCalls: Object.entries(countsByDate)
      .map(([date, callCount]) => ({ date, calls: callCount }))
      .reverse(),
    subscription: sourceSubscription,
    usage,
    stats: {
      totalCalls: sortedCalls.length,
      completedCalls: sortedCalls.filter((call) => call.status === 'completed').length,
      escalatedCalls: sortedCalls.filter((call) => call.status === 'escalated').length,
      recordingsAvailable: sortedCalls.filter((call) => Boolean(call.recordingUrl)).length,
    },
    dataSource,
  }
}

export const mockDashboardData = buildDashboardData()
