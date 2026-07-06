import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-md border-white/70 bg-white/82">
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" aria-hidden={true} />
          </div>
          <CardTitle className="mt-4 text-3xl">Reset your password</CardTitle>
          <CardDescription className="leading-6">
            Enter your account email and we will send a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
          <Button asChild variant="link" className="mt-4 px-0 text-muted-foreground">
            <a href="/login">
              <ArrowLeft className="h-4 w-4" aria-hidden={true} />
              Back to sign in
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
