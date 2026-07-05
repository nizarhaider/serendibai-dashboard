import { LockKeyhole } from 'lucide-react'
import { ResetPasswordForm } from '@/components/reset-password-form'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <LockKeyhole className="h-5 w-5" aria-hidden={true} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a password for your SerendibAI dashboard account.
        </p>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This reset link is missing a token. Ask SerendibAI to send a new reset email.
          </p>
        )}
      </section>
    </main>
  )
}
