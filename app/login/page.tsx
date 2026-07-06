import { Headphones, LockKeyhole } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="grid min-h-screen md:grid-cols-[0.9fr_1.1fr]">
        <section className="flex items-center justify-center bg-secondary px-6 py-7 text-secondary-foreground md:py-10">
          <div className="max-w-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Headphones className="h-5 w-5" aria-hidden={true} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              SerendibAI customer dashboard
            </h1>
            <p className="mt-4 text-sm leading-6 text-secondary-foreground/72">
              Track AI-powered call agents, transcripts, recordings, escalations, and WhatsApp
              setup status from one secure workspace.
            </p>
          </div>
        </section>

        <section className="flex items-start justify-center px-6 py-7 md:items-center md:py-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" aria-hidden={true} />
              </div>
              <CardTitle className="mt-3 text-2xl">Sign in</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Use the customer login credentials issued by SerendibAI.
              </p>
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
