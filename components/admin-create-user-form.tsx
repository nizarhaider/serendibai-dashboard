'use client'

import { useActionState } from 'react'
import { createCustomerUserAction, type CreateUserState } from '@/app/admin/actions'

const initialState: CreateUserState = {}

export function AdminCreateUserForm() {
  const [state, formAction, isPending] = useActionState(createCustomerUserAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Customer email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required={true}
          className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="customer@example.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Contact name
          </label>
          <input
            id="name"
            name="name"
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Optional"
          />
        </div>
        <div>
          <label htmlFor="businessName" className="text-sm font-medium">
            Business name
          </label>
          <input
            id="businessName"
            name="businessName"
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Optional"
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Creating...' : 'Create user and send reset'}
      </button>
    </form>
  )
}
