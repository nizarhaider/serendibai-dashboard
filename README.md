# SerendibAI Dashboard

Customer dashboard for tracking AI-powered WhatsApp calls, agent configuration, transcripts, and recordings.

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

If `DATABASE_URL` is not set, the dashboard uses deterministic mock data. When `DATABASE_URL` is set, it reads from Neon Postgres using the minimal V1 tables:

- `customers`
- `whatsapp_numbers`
- `agent_configs`
- `calls`

## Authentication

Customer login uses Neon Auth. Enable Auth in the Neon Console, copy the Auth Base URL, and set:

```bash
NEON_AUTH_BASE_URL="https://YOUR_NEON_AUTH_URL/neondb/auth"
NEON_AUTH_COOKIE_SECRET="$(openssl rand -base64 32)"
```

The dashboard uses one customer table. Link a Neon Auth user directly to a customer:

```sql
alter table customers add column if not exists auth_user_id text unique;
update customers set auth_user_id = 'neon-auth-user-id' where id = 'customer-id';
```

Routes:

- `/login` signs customers in.
- `/dashboard` is protected and loads only the matching `customers.auth_user_id` row.
- `/admin` lets admin users create customer logins and send password reset emails.
- `/reset-password` receives Neon Auth reset links and lets customers set a password.

Admin access is controlled by the Neon Auth user `role` column:

```sql
update neon_auth."user" set role = 'admin' where email = 'admin@example.com';
```

## Production Runtime

For an EC2 deployment, set secrets in the process environment instead of committing them:

```bash
export DATABASE_URL="postgresql://..."
export NEON_AUTH_BASE_URL="https://..."
export NEON_AUTH_COOKIE_SECRET="..."
pnpm build
pnpm start
```

Recommended process manager:

```bash
pm2 start "pnpm start" --name serendibai-dashboard
```

## Domain Note

If this dashboard is hosted under `serendibai.lk/dashboard`, configure the reverse proxy and, if needed, add a Next.js `basePath`. If it is hosted on a subdomain such as `dashboard.serendibai.lk`, no `basePath` is needed.
