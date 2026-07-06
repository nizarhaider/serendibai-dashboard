import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminCreateUserForm() {
  return (
    <form action="/admin/users" method="post" className="space-y-4">
      <div>
        <Label htmlFor="email">Customer email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required={true}
          className="mt-2"
          placeholder="customer@example.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Contact name</Label>
          <Input
            id="name"
            name="name"
            className="mt-2"
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            className="mt-2"
            placeholder="Optional"
          />
        </div>
      </div>

      <Button type="submit">
        Create user and send reset
      </Button>
    </form>
  )
}
