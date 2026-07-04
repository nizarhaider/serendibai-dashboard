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

## Production Runtime

For an EC2 deployment, set `DATABASE_URL` in the process environment instead of committing it:

```bash
export DATABASE_URL="postgresql://..."
pnpm build
pnpm start
```

Recommended process manager:

```bash
pm2 start "pnpm start" --name serendibai-dashboard
```

## Domain Note

If this dashboard is hosted under `serendibai.lk/dashboard`, configure the reverse proxy and, if needed, add a Next.js `basePath`. If it is hosted on a subdomain such as `dashboard.serendibai.lk`, no `basePath` is needed.
