import { Coins, PhoneCall, Settings, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ComponentType } from 'react'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/workspace-shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCurrentAdminUser } from '@/lib/admin-data'
import { listSubscriptionPlans } from '@/lib/billing-data'
import { getDashboardDataForCustomer } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ customerId: string }>
  searchParams: Promise<{ mode?: string }>
}

const navItems: WorkspaceNavItem[] = [
  { label: 'Admin dashboard', href: '/admin', icon: ShieldCheck, active: true },
  { label: 'Customer dashboard', href: '/dashboard', icon: PhoneCall },
]

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  }).format(new Date(value))
}

export default async function AdminCustomerPage({ params, searchParams }: PageProps) {
  const adminUser = await getCurrentAdminUser()

  if (!adminUser) {
    redirect('/login')
  }

  if (adminUser.role !== 'admin') {
    redirect('/dashboard')
  }

  const [{ customerId }, { mode }, data, plans] = await Promise.all([
    params,
    searchParams,
    params.then(({ customerId: id }) => getDashboardDataForCustomer(id)),
    listSubscriptionPlans(),
  ])

  if (!data) {
    redirect('/admin')
  }

  return (
    <WorkspaceShell
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: data.customer.businessName }]}
      headerActions={
        <form action="/logout" method="post">
          <Button variant="outline" type="submit">
            Log out
          </Button>
        </form>
      }
      headerDescription={
        mode === 'impersonate'
          ? 'Admin customer context. Actions apply to this customer account.'
          : 'Customer usage, calls, and subscription controls.'
      }
      headerEyebrow="Customer admin"
      headerTitle={data.customer.businessName}
      navItems={navItems}
      sidebarFooter={<SidebarPlan planName={data.subscription.planName} />}
      sidebarSubtitle="Workspace administration"
      sidebarTag="Admin"
      userEmail={adminUser.email ?? null}
    >
      <Card className="overflow-hidden border-border bg-secondary text-secondary-foreground shadow-[0_35px_80px_-45px_rgba(16,28,43,0.4)]">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full border-white/15 bg-white/8 text-secondary-foreground">
              Customer admin
            </Badge>
            <CardTitle className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Billing, usage, and account context for {data.customer.businessName}.
            </CardTitle>
            <CardDescription className="mt-3 max-w-xl text-sm leading-6 text-secondary-foreground/72">
              Review subscription usage, recent calls, and linked account details before making
              plan changes.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-white/8 px-3 py-1.5 text-secondary-foreground"
          >
            {data.subscription.planName} plan
          </Badge>
        </CardHeader>
      </Card>

      {mode === 'impersonate' ? (
        <Alert>
          <AlertDescription>
            You are viewing this workspace as an admin. This does not expose or change the
            customer&apos;s password.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={Settings} label="Plan" value={data.subscription.planName} />
        <SummaryCard
          icon={Coins}
          label="Tokens"
          value={data.usage.tokensUsed.toLocaleString()}
          detail={`of ${data.usage.tokenLimit.toLocaleString()}`}
        />
        <SummaryCard
          icon={PhoneCall}
          label="Calls"
          value={data.usage.callsMade.toLocaleString()}
          detail={`of ${data.usage.callLimit.toLocaleString()}`}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Auth user"
          value={data.customer.authUserId ? 'Linked' : 'Not linked'}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-white/72">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Assign the active billing plan for this customer workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={`/admin/customers/${customerId}/subscription`}
              method="post"
              className="space-y-4"
            >
              <Label>Plan</Label>
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

        <Card className="bg-white/72">
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>Reference data currently stored for this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="Contact" value={data.customer.contactName ?? 'Not set'} />
              <Info label="Email" value={data.customer.email ?? 'Not set'} />
              <Info label="Phone" value={data.customer.phone ?? 'Not set'} />
              <Info label="Customer ID" value={data.customer.id} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden bg-white/72">
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
          <CardDescription>Latest calls for this customer.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table className="min-w-[640px] md:min-w-[760px]">
            <TableHeader className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.calls.map((call) => (
                <TableRow key={call.id} className="align-top">
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatDateTime(call.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{call.customerPhone ?? 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.status}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[220px] max-w-xl whitespace-normal text-muted-foreground">
                    {call.transcript ?? 'No transcript captured.'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </WorkspaceShell>
  )
}

function SidebarPlan({ planName }: { planName: string }) {
  return (
    <Card className="border-border/80 bg-muted/55 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Current plan</CardTitle>
        <CardDescription className="leading-6">
          This customer is currently assigned to the {planName} subscription.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: IconComponent
  label: string
  value: string
  detail?: string
}) {
  return (
    <Card className="bg-white/72">
      <CardContent>
        <div className="inline-flex rounded-2xl bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/75 px-4 py-3 ring-1 ring-border/60">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  )
}
