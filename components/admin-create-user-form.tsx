import { createCustomerUserAction } from '@/app/admin/actions'

export function AdminCreateUserForm() {
  return (
    <form action={createCustomerUserAction} className="space-y-4">
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

      <button
        type="submit"
        className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/92"
      >
        Create user and send reset
      </button>
    </form>
  )
}
