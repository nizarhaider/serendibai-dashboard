import { Headphones, LockKeyhole } from 'lucide-react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getAuth, isAuthConfigured } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const auth = getAuth()
  const { setup } = await searchParams

  if (auth) {
    const { data: session } = await auth.getSession()

    if (session?.user) {
      redirect('/dashboard')
    }
  }

  const setupMissing = setup === 'missing' || !isAuthConfigured()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex items-center justify-center bg-secondary px-6 py-10 text-secondary-foreground">
          <div className="max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Headphones className="h-6 w-6" aria-hidden={true} />
            </div>
            <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
              SerendibAI customer dashboard
            </h1>
            <p className="mt-4 text-sm leading-6 text-secondary-foreground/72">
              Track AI-powered call agents, transcripts, recordings, escalations, and WhatsApp
              setup status from one secure workspace.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden={true} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the customer login credentials issued by SerendibAI.
            </p>

            {setupMissing ? (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
                Neon Auth is not configured in this environment yet. Add
                `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` to enable customer login.
              </div>
            ) : (
              <LoginForm />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
