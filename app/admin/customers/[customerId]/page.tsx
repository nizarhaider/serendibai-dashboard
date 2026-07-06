import { ArrowLeft, Coins, PhoneCall, Settings, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button asChild variant="link" className="px-0 text-muted-foreground">
              <a href="/admin">
                <ArrowLeft className="h-4 w-4" aria-hidden={true} />
                Admin
              </a>
            </Button>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {data.customer.businessName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'impersonate'
                ? 'Admin customer context. Actions apply to this customer account.'
                : 'Customer usage, calls, and subscription controls.'}
            </p>
          </div>
          <form action="/logout" method="post">
            <Button variant="outline" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent>
            <form
              action={`/admin/customers/${customerId}/subscription`}
              method="post"
              className="space-y-4"
            >
              <Label>Plan</Label>
              <Select
                name="planId"
                defaultValue={data.subscription.planId}
              >
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
              <Button>
                Update plan
              </Button>
            </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <p className="text-sm text-muted-foreground">Latest calls for this customer.</p>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[760px]">
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
                    <TableCell className="max-w-xl text-muted-foreground">
                      {call.transcript ?? 'No transcript captured.'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

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
    <Card>
      <CardContent>
      <Icon className="h-5 w-5 text-primary" aria-hidden={true} />
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  )
}
