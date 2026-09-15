# SerendibAI Portal

Customer workspace at https://portal.serendibai.lk. Next.js on Netlify, Neon Postgres for persisted customer data and sessions, Vast.ai for persistent Gemini Live voice runtimes.

## Local development

Install with `pnpm install`. Configure `DATABASE_URL`, `GEMINI_API_KEY`, `VASTAI_API_KEY`, `INTERNAL_API_KEY` (encryption secret) and `PORTAL_URL` in `.env.local`. Existing WhatsApp integration variables are optional defaults for the migrated agent. Never expose these as `NEXT_PUBLIC_*` variables.

Run `node --env-file=.env.local scripts/migrate.mjs`, then `pnpm dev`. The idempotent migration imports the existing business agent and historical calls, documents and catalogue. It seeds the requested temporary admin account once; it does not overwrite an existing password.

## Data and capabilities

- Authenticated sessions are random, hashed in Neon, HTTP-only, secure in production, and expire after 12 hours. Mutations enforce same-origin requests and rate limits. Every customer query is scoped to the session customer.
- Uploaded PDF, DOCX, TXT, MD and CSV files are parsed to text, bounded to 5 MB and 500,000 characters, and searched using Postgres full-text search. Scanned documents need OCR before upload. Original binaries are not retained.
- Excel `.xlsx` imports are reviewed before insertion. The downloadable template defines columns; formulas are rejected. Up to 500 rows per import. Inline editing persists validated product and service rows.
- Historical calls retain provenance. Missing token and duration measurements are null, never fabricated. New runtime calls upsert idempotently. Dashboard filters and quota reference values are explicit. Quotas are administrative planning allowances, not a billing subscription.
- The prompt assistant uses Gemini with Google Search and URL context. Sources are shown and drafts require review and application before saving.
- Agent credentials are AES-256-GCM encrypted at rest using `INTERNAL_API_KEY`. Compute receives a scoped runtime token rather than a database credential. Rotate the encryption secret only with a credential migration.
- Vast offer availability and pricing are live. Provision, start, stop, restart and destroy are authenticated and audited. A per-agent operation lock prevents duplicate submissions; a customer throttle bounds provisioning. Stopped instances still incur storage charges.
- Configuration loads for new calls; tool permissions are also checked on every execution. Restart disconnects calls. CPU/memory and active-call counts come from runtime heartbeats, not simulated GPU inference.
- Meta webhooks require a saved app secret. The stable portal webhook proxies signed events to an HTTPS runtime tunnel. The migrated phone retains its original named Cloudflare tunnel. New agents require their own Meta phone configuration.

## Validation

`pnpm build`, `pnpm lint`, and `pnpm exec playwright test`. Browser tests cover authentication, real uploads, Excel/manual editing, persisted configuration, responsive pages and error handling. With `DATABASE_URL` in the test environment, they also cover scoped runtime retrieval, disabled tools, duplicate call ingestion and customer isolation. QA records are removed after tests.

The voice runtime repository also runs `uv run python -m pytest`, including the recording tests.

## Deployment

Netlify site `serendibai-portal` builds `pnpm build` from this repository's main branch using the Next.js plugin. Configure secrets in Netlify environment variables. Deploy with `netlify deploy --build --prod --site 3be51ad4-a368-4b12-bf2b-1907eb225079`. The marketing site is a separate project.

The default admin credential is temporary and must be replaced before inviting customers. This initial workspace has an administrator login; customer self-registration, billing and invitation flows are not enabled.
