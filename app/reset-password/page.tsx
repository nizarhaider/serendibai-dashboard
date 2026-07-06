import { LockKeyhole } from 'lucide-react'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" aria-hidden={true} />
          </div>
          <CardTitle className="mt-3 text-2xl">Set your password</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Choose a password for your SerendibAI dashboard account.
          </p>
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
