import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
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
import { signOutAction } from '@/app/dashboard/actions'
import CallsChart from '@/components/calls-chart'
import { getAuth } from '@/lib/auth/server'
import { getDashboardData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

const navItems = [
  { label: 'Overview', icon: Activity, active: true },
  { label: 'Calls', icon: PhoneCall },
  { label: 'Agent setup', icon: Bot },
  { label: 'Customers', icon: Users },
  { label: 'Settings', icon: Settings },
]

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  escalated: 'bg-orange-50 text-orange-700 ring-orange-200',
  missed: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  started: 'bg-sky-50 text-sky-700 ring-sky-200',
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
  return statusStyles[status] ?? 'bg-slate-50 text-slate-700 ring-slate-200'
}

export default async function Home() {
  const auth = getAuth()
  const sessionResult = auth ? await auth.getSession() : null
  const user = sessionResult?.data?.user

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
                  href="#"
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
                <span className="rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
                  {data.customer.contactName ?? 'No contact assigned'}
                </span>
                <span
                  className={`rounded-md px-3 py-2 font-medium ring-1 ${statusClassName(
                    data.whatsappNumber?.status ?? 'pending'
                  )}`}
                >
                  WhatsApp {data.whatsappNumber?.status ?? 'pending'}
                </span>
                {auth ? (
                  <form action={signOutAction}>
                    <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-medium hover:bg-muted">
                      <LogOut className="h-4 w-4" aria-hidden={true} />
                      Log out
                    </button>
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

            <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Call volume</h2>
                    <p className="text-sm text-muted-foreground">
                      Recent WhatsApp call activity by day
                    </p>
                  </div>
                  <span className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Asia/Colombo
                  </span>
                </div>
                <CallsChart data={data.dailyCalls} />
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="font-semibold">Agent configuration</h2>
                <div className="mt-5 space-y-4">
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
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold">Recent calls</h2>
                  <p className="text-sm text-muted-foreground">
                    Latest customer conversations handled by the AI agent
                  </p>
                </div>
                <button className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Time</th>
                      <th className="px-5 py-3 font-medium">Customer phone</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Transcript</th>
                      <th className="px-5 py-3 font-medium">Recording</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.calls.map((call) => (
                      <tr key={call.id} className="border-t border-border align-top">
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground">
                          {formatDateTime(call.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium">
                          {call.customerPhone ?? 'Unknown'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${statusClassName(
                              call.status
                            )}`}
                          >
                            {call.status}
                          </span>
                        </td>
                        <td className="max-w-xl px-5 py-4 text-muted-foreground">
                          {call.transcript ?? 'No transcript captured yet.'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {call.recordingUrl ? (
                            <a href={call.recordingUrl} className="font-medium text-primary">
                              Open
                            </a>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

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
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden={true} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">No customer account linked</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {email ?? 'This signed-in user'} is authenticated, but there is no matching
          customers.auth_user_id row yet. Add this Neon Auth user ID to the customer record before
          granting dashboard access.
        </p>
        <form action={signOutAction} className="mt-6">
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
            <LogOut className="h-4 w-4" aria-hidden={true} />
            Log out
          </button>
        </form>
      </section>
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
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
    </div>
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}
