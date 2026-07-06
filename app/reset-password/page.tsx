import { LockKeyhole } from 'lucide-react'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; token_hash?: string; code?: string; otp?: string }>
}) {
  const { token, token_hash, code, otp } = await searchParams
  const resetToken = token ?? token_hash ?? code ?? otp

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-md border-white/70 bg-white/82">
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" aria-hidden={true} />
          </div>
          <CardTitle className="mt-4 text-3xl">Set your password</CardTitle>
          <CardDescription className="leading-6">
            Choose a password for your SerendibAI dashboard account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetToken ? (
            <ResetPasswordForm initialToken={resetToken} />
          ) : (
            <ResetPasswordForm initialToken="" />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
