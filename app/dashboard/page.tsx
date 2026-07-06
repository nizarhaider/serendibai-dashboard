import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Headphones,
  MessageSquareText,
  PhoneCall,
  Radio,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType } from 'react'
import CallsChart from '@/components/calls-chart'
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
import { getAuth } from '@/lib/auth/server'
import { getSessionFromAuthRoute } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

const navItems = [
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
              return (
                <a
                  href={item.href}
                  key={item.label}
                  className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    item.active
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
                <p className="text-sm text-muted-foreground">Customer dashboard</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {data.customer.businessName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="h-8 rounded-lg px-3 text-muted-foreground">
                  {data.customer.contactName ?? 'No contact assigned'}
                </Badge>
                <Badge variant="outline" className={statusClassName(data.whatsappNumber?.status ?? 'pending')}>
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
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
              />
              <MetricCard
                label="Calls this month"
                value={data.usage.callsMade.toLocaleString()}
                detail={`${Math.round(
                  (data.usage.callsMade / Math.max(data.usage.callLimit, 1)) * 100
                )}% of ${data.usage.callLimit.toLocaleString()}`}
                icon={PhoneCall}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Call volume</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Recent WhatsApp call activity by day
                    </p>
                  </div>
                  <Badge variant="secondary">
                    Asia/Colombo
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CallsChart data={data.dailyCalls} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent configuration</CardTitle>
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
                  <div className="rounded-md bg-muted p-3">
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

            <Card>
              <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Recent calls</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Latest customer conversations handled by the AI agent
                  </p>
                </div>
                <Button variant="outline">
                  Export CSV
                </Button>
              </div>

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
          </div>
        </section>
      </div>
    </main>
  )
}

function NoCustomerAccess({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-lg">
        <CardContent>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden={true} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">No customer account linked</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {email ?? 'This signed-in user'} is authenticated, but there is no matching
          customers.auth_user_id row yet. Add this Neon Auth user ID to the customer record before
          granting dashboard access.
        </p>
        <form action="/logout" method="post" className="mt-6">
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
}: {
  label: string
  value: string
  detail: string
  icon: IconComponent
}) {
  return (
    <Card>
      <CardContent>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden={true} />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
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
    <Card>
      <CardContent>
      <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}
