import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Download,
  LogOut,
  MessageSquareText,
  PhoneCall,
  Radio,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType } from 'react'
import CallsChart from '@/components/calls-chart'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAuth } from '@/lib/auth/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard-data'
import type { CallRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

const navItems: WorkspaceNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Activity, active: true },
  { label: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { label: 'Agent setup', href: '/dashboard/agent', icon: Bot },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const statusStyles: Record<string, string> = {
  active: 'border-primary/25 bg-primary/10 text-primary',
  completed: 'border-primary/25 bg-primary/10 text-primary',
  escalated: 'border-accent/30 bg-accent/10 text-accent',
  missed: 'border-destructive/25 bg-destructive/10 text-destructive',
  pending: 'border-border bg-muted text-muted-foreground',
  started: 'border-border bg-muted text-muted-foreground',
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

function statusClassName(status: string) {
  return statusStyles[status] ?? 'border-border bg-muted text-muted-foreground'
}

export default async function Home() {
  const auth = getAuth()
  const sessionResult = auth ? await getSessionFromAuthRoute() : null
  const user = sessionResult?.user

  if (auth && !user) {
    redirect('/login')
  }

  const data = await getDashboardData(user?.id)

  if (!data) {
    return <NoCustomerAccess email={user?.email ?? null} />
  }

  const completionRate =
    data.stats.totalCalls === 0
      ? 0
      : Math.round((data.stats.completedCalls / data.stats.totalCalls) * 100)

  return (
    <WorkspaceShell
      breadcrumbs={[{ label: 'Dashboard' }]}
      headerActions={
        <>
          <Badge variant="outline" className="h-8 rounded-full px-3 text-muted-foreground">
            {data.customer.contactName ?? 'No contact assigned'}
          </Badge>
          <Badge
            variant="outline"
            className={`h-8 rounded-full px-3 ${statusClassName(data.whatsappNumber?.status ?? 'pending')}`}
          >
            WhatsApp {data.whatsappNumber?.status ?? 'pending'}
          </Badge>
          {auth ? (
            <form action="/logout" method="post">
              <Button variant="outline" type="submit">
                <LogOut className="h-4 w-4" aria-hidden={true} />
                Log out
              </Button>
            </form>
          ) : null}
        </>
      }
      headerEyebrow="Customer dashboard"
      headerTitle={data.customer.businessName}
      navItems={navItems}
      sidebarFooter={<SidebarStatus dataSource={data.dataSource} />}
      sidebarSubtitle="Customer call operations"
      sidebarTag="Customer"
      userEmail={user?.email ?? null}
    >
      <Card className="overflow-hidden border-border bg-secondary text-secondary-foreground shadow-[0_28px_70px_-44px_rgba(16,28,43,0.5)]">
        <CardHeader className="gap-5 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/15 bg-white/8 text-secondary-foreground">
                Live inbound desk
              </Badge>
              <Badge variant="outline" className="border-white/15 bg-white/8 text-secondary-foreground">
                Sinhala / Tamil / English
              </Badge>
            </div>
            <CardTitle className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              WhatsApp voice agent performance for today&apos;s front desk.
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground/72">
              Monitor answered calls, handoffs, transcripts, and quota usage for the managed
              SerendibAI setup backing this customer workspace.
            </CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            <HeroStat label="Plan" value={data.subscription.planName} />
            <HeroStat label="Calls" value={data.stats.completedCalls.toString()} />
            <HeroStat label="Handoff" value={data.stats.escalatedCalls.toString()} />
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total calls"
          value={data.stats.totalCalls.toString()}
          detail="All tracked inbound calls"
          icon={PhoneCall}
        />
        <MetricCard
          label="Completion rate"
          value={`${completionRate}%`}
          detail={`${data.stats.completedCalls} completed calls`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Escalations"
          value={data.stats.escalatedCalls.toString()}
          detail="Calls handed to staff"
          icon={Radio}
        />
        <MetricCard
          label="Recordings"
          value={data.stats.recordingsAvailable.toString()}
          detail="Calls with audio links"
          icon={MessageSquareText}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Current plan"
          value={data.subscription.planName}
          detail={`$${(data.subscription.monthlyPriceCents / 100).toFixed(0)} per month`}
          icon={Settings}
        />
        <MetricCard
          label="Tokens used"
          value={data.usage.tokensUsed.toLocaleString()}
          detail={`${Math.round(
            (data.usage.tokensUsed / Math.max(data.usage.tokenLimit, 1)) * 100
          )}% of ${data.usage.tokenLimit.toLocaleString()}`}
          icon={Coins}
          progress={data.usage.tokensUsed / Math.max(data.usage.tokenLimit, 1)}
        />
        <MetricCard
          label="Calls this month"
          value={data.usage.callsMade.toLocaleString()}
          detail={`${Math.round(
            (data.usage.callsMade / Math.max(data.usage.callLimit, 1)) * 100
          )}% of ${data.usage.callLimit.toLocaleString()}`}
          icon={PhoneCall}
          progress={data.usage.callsMade / Math.max(data.usage.callLimit, 1)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Call volume</CardTitle>
              <CardDescription>Recent WhatsApp call activity by day</CardDescription>
            </div>
            <Badge variant="secondary">Asia/Colombo</Badge>
          </CardHeader>
          <CardContent>
            <CallsChart data={data.dailyCalls} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent configuration</CardTitle>
            <CardDescription>Current live setup for the active AI agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Agent" value={data.agentConfig?.name ?? 'Not configured'} />
            <InfoRow
              label="Languages"
              value={data.agentConfig?.languages.join(', ') ?? 'Not configured'}
            />
            <InfoRow
              label="WhatsApp number"
              value={data.whatsappNumber?.phoneNumber ?? 'Not connected'}
            />
            <div className="rounded-2xl bg-muted/75 p-4 ring-1 ring-border/60">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Agent prompt
              </p>
              <p className="mt-2 line-clamp-5 text-sm leading-relaxed">
                {data.agentConfig?.systemPrompt ?? 'No prompt has been configured yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>
              Latest customer conversations handled by the AI agent
            </CardDescription>
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

      <section className="grid gap-4 lg:grid-cols-3">
        <MiniPanel
          icon={ShieldCheck}
          title="Customer access"
          text="Dashboard access is tied directly to the customer account through Neon Auth."
        />
        <MiniPanel
          icon={Clock3}
          title="Next workflow"
          text="Connect Meta webhooks so the AI call server can create and update call rows."
        />
        <MiniPanel
          icon={Bot}
          title="Agent runtime"
          text="Use the same Neon database from the AI server and this dashboard; do not share local disk."
        />
      </section>
    </WorkspaceShell>
  )
}

function SidebarStatus({ dataSource }: { dataSource: string }) {
  return (
    <Card className="border-border/80 bg-muted/55 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Data source</CardTitle>
        <CardDescription className="leading-6">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden={true} />
          </div>
          <CardTitle className="mt-3 text-2xl">No customer account linked</CardTitle>
          <CardDescription className="leading-6">
            {email ?? 'This signed-in user'} is authenticated, but there is no matching
            `customers.auth_user_id` row yet. Add this Neon Auth user ID to the customer record
            before granting dashboard access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/logout" method="post">
            <Button variant="outline" type="submit">
              <LogOut className="h-4 w-4" aria-hidden={true} />
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  progress,
}: {
  label: string
  value: string
  detail: string
  icon: IconComponent
  progress?: number
}) {
  return (
    <Card className="bg-white/82 shadow-[0_18px_55px_-45px_rgba(16,28,43,0.42)]">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-2.5 text-primary ring-1 ring-primary/10">
            <Icon className="h-5 w-5" aria-hidden={true} />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
        {typeof progress === 'number' ? <PercentBar value={progress} /> : null}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-medium">{value}</p>
    </div>
  )
}

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
    <Card className="bg-white/78">
      <CardContent>
        <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden={true} />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/8 px-3 py-3 sm:px-4">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-secondary-foreground/58 sm:text-[11px] sm:tracking-[0.24em]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white sm:text-2xl">{value}</p>
    </div>
  )
}

function PercentBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, Math.round(value * 100)))

  return (
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
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
