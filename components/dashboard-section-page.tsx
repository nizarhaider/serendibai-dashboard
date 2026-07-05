import {
  Activity,
  Bot,
  Headphones,
  LogOut,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType } from 'react'
import { signOutAction } from '@/app/dashboard/actions'
import { getAuth } from '@/lib/auth/server'
import { getDashboardData } from '@/lib/dashboard-data'
import type { DashboardData } from '@/lib/types'

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
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  escalated: 'bg-orange-50 text-orange-700 ring-orange-200',
  missed: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  started: 'bg-sky-50 text-sky-700 ring-sky-200',
}

function statusClassName(status: string) {
  return statusStyles[status] ?? 'bg-slate-50 text-slate-700 ring-slate-200'
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
  const sessionResult = auth ? await auth.getSession() : null
  const user = sessionResult?.data?.user

  if (auth && !user) {
    redirect('/login')
  }

  const data = await getDashboardData(user?.id)

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
                <form action={signOutAction}>
                  <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                    <LogOut className="h-4 w-4" aria-hidden={true} />
                    Log out
                  </button>
                </form>
              ) : null}
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {section === 'calls' ? <CallsSection data={data} /> : null}
            {section === 'agent' ? <AgentSection data={data} /> : null}
            {section === 'customers' ? <CustomerSection data={data} /> : null}
            {section === 'settings' ? <SettingsSection data={data} /> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function CallsSection({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <h2 className="font-semibold">Call history</h2>
        <p className="text-sm text-muted-foreground">
          Latest conversations handled by the AI agent.
        </p>
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

function SettingsSection({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <MiniPanel
        icon={ShieldCheck}
        title="Access"
        text="Dashboard access is controlled by Neon Auth and linked through customers.auth_user_id."
      />
      <MiniPanel
        icon={Bot}
        title="Agent runtime"
        text="The AI server should write calls, transcripts, and recordings to this same Neon database."
      />
      <MiniPanel
        icon={Settings}
        title="Workspace"
        text={`Current workspace: ${data.customer.businessName}. Configuration editing is planned next.`}
      />
    </section>
  )
}

function NoCustomerAccess({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden={true} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">No customer account linked</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {email ?? 'This signed-in user'} is authenticated, but there is no matching customer row.
        </p>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}
