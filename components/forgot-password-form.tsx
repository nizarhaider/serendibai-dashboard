'use client'

import { useActionState } from 'react'
import { forgotPasswordAction, type ForgotPasswordState } from '@/app/forgot-password/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ForgotPasswordState = {}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required={true}
          className="mt-2 h-11"
          placeholder="customer@example.com"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.sent ? (
        <Alert>
          <AlertDescription>If that account exists, a password reset email has been sent.</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full"
      >
        {isPending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  )
}
