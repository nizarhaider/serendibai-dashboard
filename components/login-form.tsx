'use client'

import { useActionState } from 'react'
import { signInAction, type LoginState } from '@/app/login/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState)

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required={true}
          className="mt-2"
          placeholder="customer@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Password</Label>
          <a href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80">
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required={true}
          className="mt-2"
          placeholder="Enter your password"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
