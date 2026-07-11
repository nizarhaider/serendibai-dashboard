import { Headphones, LockKeyhole } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isAuthConfigured } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const { setup } = await searchParams
  const setupMissing = setup === 'missing' || !isAuthConfigured()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen md:grid-cols-[1.05fr_0.95fr]">
        <section className="dashboard-hero flex items-center justify-center bg-secondary px-6 py-12 text-secondary-foreground md:py-10">
          <div className="max-w-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#69e0c1] text-[#0b1714] shadow-[0_18px_40px_-20px_rgba(105,224,193,.45)]">
              <Headphones className="h-5 w-5" aria-hidden={true} />
            </div>
            <h1 className="mt-6 max-w-sm text-4xl font-semibold tracking-tight md:text-5xl">
              Your call operations, beautifully clear.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-secondary-foreground/68">
              Track multilingual AI agents, transcripts, outcomes, recordings, and handoffs from
              one calm, secure workspace.
            </p>
          </div>
        </section>

        <section className="relative flex items-start justify-center px-6 py-7 md:items-center md:py-10">
          <Card className="relative w-full max-w-md border-white bg-white/92 shadow-[0_34px_90px_-42px_rgba(15,37,30,.38)]">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" aria-hidden={true} />
              </div>
              <CardTitle className="mt-4 text-3xl">Sign in</CardTitle>
              <CardDescription className="leading-6">
                Use the customer login credentials issued by SerendibAI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupMissing ? (
                <Alert>
                  <AlertDescription>
                    Neon Auth is not configured in this environment yet. Add
                    `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` to enable customer login.
                  </AlertDescription>
                </Alert>
              ) : (
                <LoginForm />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
