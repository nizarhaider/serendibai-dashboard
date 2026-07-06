import {
  Activity,
  Bot,
  Coins,
  Headphones,
  LogOut,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listSubscriptionPlans } from '@/lib/billing-data'
import { getAuth } from '@/lib/auth/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard-data'
import type { DashboardData, SubscriptionPlan } from '@/lib/types'

export type DashboardSection = 'calls' | 'agent' | 'customers' | 'settings'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: Activity, section: 'overview' },
  { label: 'Calls', href: '/dashboard/calls', icon: PhoneCall, section: 'calls' },
  { label: 'Agent setup', href: '/dashboard/agent', icon: Bot, section: 'agent' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users, section: 'customers' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'settings' },
]

const titles: Record<DashboardSection, string> = {
  calls: 'Calls',
  agent: 'Agent setup',
  customers: 'Customer profile',
  settings: 'Settings',
}

const subtitles: Record<DashboardSection, string> = {
  calls: 'Review call history, statuses, transcripts, and recordings.',
  agent: 'View the active AI agent configuration for this customer.',
  customers: 'Manage the customer account details linked to this login.',
  settings: 'Operational settings for this dashboard workspace.',
}

const statusStyles: Record<string, string> = {
  active: 'border-primary/25 bg-primary/10 text-primary',
  completed: 'border-primary/25 bg-primary/10 text-primary',
  escalated: 'border-accent/30 bg-accent/10 text-accent',
  missed: 'border-destructive/25 bg-destructive/10 text-destructive',
  pending: 'border-border bg-muted text-muted-foreground',
  started: 'border-border bg-muted text-muted-foreground',
}

function statusClassName(status: string) {
  return statusStyles[status] ?? 'border-border bg-muted text-muted-foreground'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  }).format(new Date(value))
}

export async function DashboardSectionPage({ section }: { section: DashboardSection }) {
  const auth = getAuth()
  const sessionResult = auth ? await getSessionFromAuthRoute() : null
  const user = sessionResult?.user

  if (auth && !user) {
    redirect('/login')
  }

  const data = await getDashboardData(user?.id)
  const plans = data && section === 'settings' ? await listSubscriptionPlans() : []

  if (!data) {
    return <NoCustomerAccess email={user?.email ?? null} />
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-border bg-secondary px-4 py-4 text-secondary-foreground lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Headphones className="h-5 w-5" aria-hidden={true} />
            </div>
            <div>
              <p className="font-semibold">SerendibAI</p>
              <p className="text-xs text-secondary-foreground/65">Call operations</p>
            </div>
          </div>
          {user?.email ? (
            <p className="mt-4 truncate px-2 text-xs text-secondary-foreground/60">{user.email}</p>
          ) : null}

          <nav className="mt-6 flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = item.section === section

              return (
                <a
                  href={item.href}
                  key={item.label}
                  className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white/12 text-white'
                      : 'text-secondary-foreground/72 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden={true} />
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-white/10 bg-white/5 p-4 lg:block">
            <p className="text-sm font-medium">Data source</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary-foreground/70">
              {data.dataSource === 'neon'
                ? 'Connected to Neon Postgres.'
                : 'Using local mock data. Set DATABASE_URL to read Neon.'}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{data.customer.businessName}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {titles[section]}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{subtitles[section]}</p>
              </div>
              {auth ? (
                <form action="/logout" method="post">
                  <Button variant="outline" type="submit">
                    <LogOut className="h-4 w-4" aria-hidden={true} />
                    Log out
                  </Button>
                </form>
              ) : null}
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {section === 'calls' ? <CallsSection data={data} /> : null}
            {section === 'agent' ? <AgentSection data={data} /> : null}
            {section === 'customers' ? <CustomerSection data={data} /> : null}
            {section === 'settings' ? <SettingsSection data={data} plans={plans} /> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function CallsSection({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call history</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest conversations handled by the AI agent.
        </p>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[820px]">
          <TableHeader className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Customer phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead>Recording</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.calls.map((call) => (
              <TableRow key={call.id} className="align-top">
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {formatDateTime(call.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {call.customerPhone ?? 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusClassName(call.status)}>
                    {call.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xl text-muted-foreground">
                  {call.transcript ?? 'No transcript captured yet.'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {call.recordingUrl ? (
                    <a href={call.recordingUrl} className="font-medium text-primary">
                      Open
                    </a>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function AgentSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Agent configuration">
        <InfoRow label="Agent name" value={data.agentConfig?.name ?? 'Not configured'} />
        <InfoRow
          label="Languages"
          value={data.agentConfig?.languages.join(', ') ?? 'Not configured'}
        />
        <InfoRow label="WhatsApp number" value={data.whatsappNumber?.phoneNumber ?? 'Not connected'} />
        <InfoRow label="Status" value={data.whatsappNumber?.status ?? 'pending'} />
      </Panel>
      <Panel title="System prompt">
        <p className="text-sm leading-6 text-muted-foreground">
          {data.agentConfig?.systemPrompt ?? 'No prompt has been configured yet.'}
        </p>
      </Panel>
    </section>
  )
}

function CustomerSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Panel title="Business details">
        <InfoRow label="Business" value={data.customer.businessName} />
        <InfoRow label="Contact" value={data.customer.contactName ?? 'Not set'} />
        <InfoRow label="Email" value={data.customer.email ?? 'Not set'} />
        <InfoRow label="Phone" value={data.customer.phone ?? 'Not set'} />
      </Panel>
      <Panel title="Account access">
        <InfoRow label="Customer ID" value={data.customer.id} />
        <InfoRow label="Auth user" value={data.customer.authUserId ?? 'Not linked'} />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Customer profile edits are read-only for now. Use the admin dashboard to create users and
          link accounts.
        </p>
      </Panel>
    </section>
  )
}

function SettingsSection({ data, plans }: { data: DashboardData; plans: SubscriptionPlan[] }) {
  return (
    <section className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MiniPanel
          icon={Coins}
          title="Tokens used"
          text={`${data.usage.tokensUsed.toLocaleString()} of ${data.usage.tokenLimit.toLocaleString()} this month.`}
        />
        <MiniPanel
          icon={PhoneCall}
          title="Calls made"
          text={`${data.usage.callsMade.toLocaleString()} of ${data.usage.callLimit.toLocaleString()} this month.`}
        />
        <MiniPanel
          icon={Settings}
          title="Current plan"
          text={`${data.subscription.planName} at $${(data.subscription.monthlyPriceCents / 100).toFixed(0)} per month.`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Subscription plan</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the plan for this workspace. Changes apply to the current billing period.
          </p>
        </CardHeader>
        <CardContent>
          <form action="/dashboard/subscription" method="post" className="grid max-w-sm gap-3">
            <Select name="planId" defaultValue={data.subscription.planId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - ${(plan.monthlyPriceCents / 100).toFixed(0)}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>Update plan</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <MiniPanel
          icon={ShieldCheck}
          title="Access"
          text="Dashboard access is controlled by Neon Auth and linked through customers.auth_user_id."
        />
        <MiniPanel
          icon={Bot}
          title="Agent runtime"
          text="The AI server should write calls, transcripts, recordings, and token usage to this same Neon database."
        />
      </section>
    </section>
  )
}

function NoCustomerAccess({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-lg">
        <CardContent>
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden={true} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">No customer account linked</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {email ?? 'This signed-in user'} is authenticated, but there is no matching customer row.
        </p>
        </CardContent>
      </Card>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="max-w-[65%] break-words text-right text-sm font-medium">{value}</p>
    </div>
  )
}

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

function MiniPanel({
  icon: Icon,
  title,
  text,
}: {
  icon: IconComponent
  title: string
  text: string
}) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}
