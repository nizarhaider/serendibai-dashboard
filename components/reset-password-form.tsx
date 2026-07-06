'use client'

import { useActionState, useState } from 'react'
import { resetPasswordAction, type ResetPasswordState } from '@/app/reset-password/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ResetPasswordState = {}

function findTokenInUrl() {
  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return (
    params.get('token') ??
    params.get('token_hash') ??
    params.get('code') ??
    params.get('otp') ??
    hashParams.get('token') ??
    hashParams.get('token_hash') ??
    hashParams.get('code') ??
    hashParams.get('otp') ??
    ''
  )
}

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)
  const [token] = useState(() =>
    typeof window === 'undefined' ? initialToken : initialToken || findTokenInUrl()
  )

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={true}
          minLength={8}
          className="mt-2 h-11"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required={true}
          minLength={8}
          className="mt-2 h-11"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!token ? (
        <Alert>
          <AlertDescription>
            This reset link is missing a token. Request a new reset email and use the latest link.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={isPending || !token}
        className="h-11 w-full"
      >
        {isPending ? 'Saving...' : 'Set password'}
      </Button>
    </form>
  )
}
