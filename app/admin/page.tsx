import { Headphones, ShieldCheck, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { resendPasswordResetAction } from '@/app/admin/actions'
import { signOutAction } from '@/app/dashboard/actions'
import { AdminCreateUserForm } from '@/components/admin-create-user-form'
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
        <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden={true} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You are signed in, but this account is not allowed to manage SerendibAI users.
          </p>
          <form action={signOutAction} className="mt-6">
            <button className="h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
              Log out
            </button>
          </form>
        </section>
      </main>
    )
  }

  const [{ message }, users] = await Promise.all([searchParams, listAdminUsers()])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Headphones className="h-5 w-5" aria-hidden={true} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SerendibAI</p>
              <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a className="rounded-md border border-border px-3 py-2 font-medium hover:bg-muted" href="/dashboard">
              Customer dashboard
            </a>
            <form action={signOutAction}>
              <button className="rounded-md border border-border px-3 py-2 font-medium hover:bg-muted">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {message && messages[message] ? (
          <p
            className={`rounded-md border px-3 py-2 text-sm ${
              message.includes('failed') ||
              message.includes('missing') ||
              message.includes('required')
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {messages[message]}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" aria-hidden={true} />
              <div>
                <h2 className="font-semibold">Add customer user</h2>
                <p className="text-sm text-muted-foreground">
                  Creates an auth user, links a customer row, and emails a password reset link.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <AdminCreateUserForm />
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-5">
              <h2 className="font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">
                Auth users and their linked customer accounts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Password</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-border align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium">{user.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{user.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                          {user.role ?? 'user'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {user.businessName ?? 'Not linked'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${
                            user.hasPassword
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-amber-50 text-amber-700 ring-amber-200'
                          }`}
                        >
                          {user.hasPassword ? 'Set' : 'Pending'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <form action={resendPasswordResetAction}>
                          <input type="hidden" name="email" value={user.email} />
                          <button className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                            Send reset
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
