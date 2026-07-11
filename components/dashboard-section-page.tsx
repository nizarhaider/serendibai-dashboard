import {
  Activity,
  Bot,
  Coins,
  Download,
  LogOut,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType, ReactNode } from 'react'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/workspace-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listSubscriptionPlans } from '@/lib/billing-data'
import { getAuth } from '@/lib/auth/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard-data'
import type { CallRecord, DashboardData, SubscriptionPlan } from '@/lib/types'

export type DashboardSection = 'calls' | 'agent' | 'customers' | 'settings'

const navItems: Array<Omit<WorkspaceNavItem, 'active'>> = [
  { label: 'Overview', href: '/dashboard', icon: Activity },
  { label: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { label: 'Agent setup', href: '/dashboard/agent', icon: Bot },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
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

  const currentNav = navItems.map((item) => ({
    ...item,
    active:
      (section === 'calls' && item.href === '/dashboard/calls') ||
      (section === 'agent' && item.href === '/dashboard/agent') ||
      (section === 'customers' && item.href === '/dashboard/customers') ||
      (section === 'settings' && item.href === '/dashboard/settings'),
  }))

  return (
    <WorkspaceShell
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: titles[section] }]}
      headerActions={
        auth ? (
          <form action="/logout" method="post">
            <Button variant="outline" type="submit">
              <LogOut className="h-4 w-4" aria-hidden={true} />
              Log out
            </Button>
          </form>
        ) : null
      }
      headerDescription={subtitles[section]}
      headerEyebrow={data.customer.businessName}
      headerTitle={titles[section]}
      navItems={currentNav}
      sidebarFooter={<SidebarStatus dataSource={data.dataSource} />}
      sidebarSubtitle="Customer call operations"
      sidebarTag="Customer"
      userEmail={user?.email ?? null}
    >
      <Card className="dashboard-hero overflow-hidden border-white/5 bg-secondary text-secondary-foreground shadow-[0_35px_80px_-45px_rgba(16,28,43,0.55)] ring-0">
        <CardHeader className="gap-4 px-6 py-2 sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-2xl">
            <Badge variant="outline" className="border-white/15 bg-white/8 text-secondary-foreground">
              Workspace
            </Badge>
            <CardTitle className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
              {titles[section]} for {data.customer.businessName}
            </CardTitle>
            <CardDescription className="mt-3 max-w-xl text-sm leading-6 text-secondary-foreground/72">
              {subtitles[section]}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-white/15 bg-white/8 px-3 py-1.5 text-secondary-foreground lg:justify-self-end"
          >
            {data.dataSource === 'neon' ? 'Connected to Neon Postgres' : 'Previewing local mock data'}
          </Badge>
        </CardHeader>
      </Card>

      {section === 'calls' ? <CallsSection data={data} /> : null}
      {section === 'agent' ? <AgentSection data={data} /> : null}
      {section === 'customers' ? <CustomerSection data={data} /> : null}
      {section === 'settings' ? <SettingsSection data={data} plans={plans} /> : null}
    </WorkspaceShell>
  )
}

function CallsSection({ data }: { data: DashboardData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Call history</CardTitle>
          <CardDescription>Latest conversations handled by the AI agent.</CardDescription>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4" aria-hidden={true} />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-3 md:hidden">
          {data.calls.map((call) => (
            <CallSummaryCard key={call.id} call={call} />
          ))}
        </div>
        <Table className="hidden min-w-[680px] md:table md:min-w-[820px]">
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
                <TableCell className="min-w-[220px] max-w-xl whitespace-normal text-muted-foreground">
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
      <Panel
        description="Runtime settings currently attached to this customer workspace."
        title="Agent configuration"
      >
        <InfoRow label="Agent name" value={data.agentConfig?.name ?? 'Not configured'} />
        <InfoRow
          label="Languages"
          value={data.agentConfig?.languages.join(', ') ?? 'Not configured'}
        />
        <InfoRow label="WhatsApp number" value={data.whatsappNumber?.phoneNumber ?? 'Not connected'} />
        <InfoRow label="Status" value={data.whatsappNumber?.status ?? 'pending'} />
      </Panel>
      <Panel description="System prompt used to steer live customer conversations." title="System prompt">
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
      <Panel description="Reference details stored for this business account." title="Business details">
        <InfoRow label="Business" value={data.customer.businessName} />
        <InfoRow label="Contact" value={data.customer.contactName ?? 'Not set'} />
        <InfoRow label="Email" value={data.customer.email ?? 'Not set'} />
        <InfoRow label="Phone" value={data.customer.phone ?? 'Not set'} />
      </Panel>
      <Panel description="Identity and access mapping for this workspace." title="Account access">
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
          <CardDescription>
            Choose the plan for this workspace. Changes apply to the current billing period.
          </CardDescription>
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

function SidebarStatus({ dataSource }: { dataSource: string }) {
  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-sm">Data source</CardTitle>
        <CardDescription className="leading-6 text-white/42">
          {dataSource === 'neon'
            ? 'Connected to Neon Postgres.'
            : 'Using local mock data. Set DATABASE_URL to read Neon.'}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function NoCustomerAccess({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden={true} />
          <CardTitle className="mt-3 text-2xl">No customer account linked</CardTitle>
          <CardDescription className="leading-6">
            {email ?? 'This signed-in user'} is authenticated, but there is no matching customer
            row.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="border-white bg-white/92">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium sm:max-w-[65%] sm:text-right">{value}</p>
    </div>
  )
}

function CallSummaryCard({ call }: { call: CallRecord }) {
  return (
    <article className="rounded-lg border border-border bg-white/82 p-4 shadow-[0_18px_55px_-45px_rgba(16,28,43,0.42)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{call.customerPhone ?? 'Unknown caller'}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{formatDateTime(call.createdAt)}</p>
        </div>
        <Badge variant="outline" className={statusClassName(call.status)}>
          {call.status}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {call.transcript ?? 'No transcript captured yet.'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Recording</span>
        {call.recordingUrl ? (
          <a href={call.recordingUrl} className="font-medium text-primary">
            Open audio
          </a>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </div>
    </article>
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
    <Card className="border-white bg-white/9 text-white ring-0">
      <CardContent>
        <div className="inline-flex rounded-xl bg-[#69e0c1] p-2 text-[#0b1714]">
          <Icon className="h-5 w-5" aria-hidden={true} />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/42">{text}</p>
      </CardContent>
    </Card>
  )
}
