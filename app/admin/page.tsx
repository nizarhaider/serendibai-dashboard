import {
  Coins,
  Headphones,
  MoreHorizontal,
  PhoneCall,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { AdminCreateUserForm } from '@/components/admin-create-user-form'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { getCurrentAdminUser, listAdminUsers } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

const messages: Record<string, string> = {
  'user-created': 'Customer user created and password reset email sent.',
  'reset-sent': 'Password reset email sent.',
  'auth-missing': 'Neon Auth is not configured.',
  'email-required': 'Enter a customer email.',
  'create-failed': 'Could not create this auth user.',
  'reset-failed': 'User created, but the reset email failed.',
}

const navItems: WorkspaceNavItem[] = [
  { label: 'Admin dashboard', href: '/admin', icon: ShieldCheck, active: true },
  { label: 'Customer dashboard', href: '/dashboard', icon: Headphones },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const adminUser = await getCurrentAdminUser()

  if (!adminUser) {
    redirect('/login')
  }

  if (adminUser.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden={true} />
            <CardTitle className="mt-3 text-2xl">Admin access required</CardTitle>
            <CardDescription className="leading-6">
              You are signed in, but this account is not allowed to manage SerendibAI users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/logout" method="post">
              <Button variant="outline">Log out</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  const [{ message }, users, plans] = await Promise.all([
    searchParams,
    listAdminUsers(),
    listSubscriptionPlans(),
  ])

  return (
    <WorkspaceShell
      breadcrumbs={[{ label: 'Admin' }]}
      headerActions={
        <form action="/logout" method="post">
          <Button variant="outline" type="submit">
            Log out
          </Button>
        </form>
      }
      headerDescription="Create customer users, reset passwords, review plan assignments, and monitor workspace health."
      headerEyebrow="SerendibAI"
      headerTitle="Admin dashboard"
      navItems={navItems}
      sidebarFooter={<AdminSidebarSummary count={users.length} />}
      sidebarSubtitle="Workspace administration"
      sidebarTag="Admin"
      userEmail={adminUser.email ?? null}
    >
      <Card className="border-border bg-secondary text-secondary-foreground shadow-[0_35px_80px_-45px_rgba(16,28,43,0.4)]">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full border-white/15 bg-white/8 text-secondary-foreground">
              Admin workspace
            </Badge>
            <CardTitle className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Manage customer access, subscription plans, and account health.
            </CardTitle>
            <CardDescription className="mt-3 max-w-xl text-sm leading-7 text-secondary-foreground/72">
              Create customer users, reset passwords, review plan assignments, and monitor current
              usage from one control surface.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-white/8 px-3 py-1.5 text-secondary-foreground"
          >
            {users.length} auth users in workspace
          </Badge>
        </CardHeader>
      </Card>

      {message && messages[message] ? (
        <Alert
          variant={
            message.includes('failed') || message.includes('missing') || message.includes('required')
              ? 'destructive'
              : 'default'
          }
        >
          <AlertDescription>{messages[message]}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-white/72">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" aria-hidden={true} />
              <div>
                <CardTitle>Add customer user</CardTitle>
                <CardDescription>
                  Creates an auth user, links a customer row, and emails a password reset link.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AdminCreateUserForm />
          </CardContent>
        </Card>

        <Card className="bg-white/72">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Auth users and their linked customer accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[1060px]">
              <TableHeader className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="align-top">
                    <TableCell>
                      <p className="font-medium">{user.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role ?? 'user'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.businessName ?? 'Not linked'}
                    </TableCell>
                    <TableCell>
                      {user.planName ? (
                        <Badge variant="outline">{user.planName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5" aria-hidden={true} />
                          {user.tokensUsed.toLocaleString()} tokens
                        </p>
                        <p className="flex items-center gap-1.5">
                          <PhoneCall className="h-3.5 w-3.5" aria-hidden={true} />
                          {user.callsMade.toLocaleString()} calls
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.hasPassword ? 'default' : 'outline'}>
                        {user.hasPassword ? 'Set' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" aria-label="Open user actions">
                            <MoreHorizontal className="h-4 w-4" aria-hidden={true} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          {user.customerId ? (
                            <>
                              <DropdownMenuItem asChild>
                                <a href={`/admin/customers/${user.customerId}`}>Manage customer</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/admin/customers/${user.customerId}?mode=impersonate`}>
                                  Log in as customer
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <form
                                action={`/admin/customers/${user.customerId}/subscription`}
                                method="post"
                                className="space-y-2 p-1"
                              >
                                <DropdownMenuLabel className="px-0">Subscription</DropdownMenuLabel>
                                <Select name="planId" defaultValue={user.planId ?? ''}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {plans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button className="w-full" size="sm">
                                  Save plan
                                </Button>
                              </form>
                            </>
                          ) : null}
                          <DropdownMenuSeparator />
                          <form action="/admin/users/reset" method="post">
                            <input type="hidden" name="email" value={user.email} />
                            <DropdownMenuItem asChild>
                              <Button
                                type="submit"
                                variant="ghost"
                                className="h-7 w-full justify-start px-1.5"
                              >
                                Send password reset
                              </Button>
                            </DropdownMenuItem>
                          </form>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </WorkspaceShell>
  )
}

function AdminSidebarSummary({ count }: { count: number }) {
  return (
    <Card className="border-border/80 bg-muted/55 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Workspace health</CardTitle>
        <CardDescription className="leading-6">
          {count} auth users are currently provisioned across the SerendibAI dashboard.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
