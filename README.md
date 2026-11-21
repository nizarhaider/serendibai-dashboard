# SerendibAI Portal

Customer workspace at https://portal.serendibai.lk. Next.js on Netlify, Neon Postgres for persisted customer data and sessions, and a separate Gemini Live voice runtime.

## Local development

Install with `pnpm install`. Configure `DATABASE_URL`, `GEMINI_API_KEY`, `INTERNAL_API_KEY` (encryption secret) and `PORTAL_URL` in `.env.local`. Existing WhatsApp integration variables are optional defaults for the migrated agent. Never expose these as `NEXT_PUBLIC_*` variables.

Run `node --env-file=.env.local scripts/migrate.mjs`, then `pnpm dev`. The transactional migration maintains portal tables in the shared Neon database. It does not seed accounts, reset passwords or rewrite agent voices.

The production portal and company voice service use the `serendib_v2` Neon project. The portal and runtime `DATABASE_URL` settings must refer to this project. The company voice service has its own runtime environment and must remain running during portal changes. Portal users must be created separately; schema migration does not create login credentials.

## Data and capabilities

- Authenticated sessions are random, hashed in Neon, HTTP-only, secure in production, and expire after 12 hours. Mutations enforce same-origin requests and rate limits. Every customer query is scoped to the session customer.
- Uploaded PDF, DOCX, TXT, MD and CSV files are parsed to text, bounded to 5 MB and 500,000 characters, and searched using Postgres full-text search. Scanned documents need OCR before upload. Original binaries are not retained.
- Excel `.xlsx` imports are reviewed before insertion. The downloadable template defines columns; formulas are rejected. Up to 500 rows per import. Inline editing persists validated product and service rows.
- Historical calls retain provenance. Missing token and duration measurements are null, never fabricated. New runtime calls upsert idempotently. Dashboard date filters use Sri Lanka time. Each section loads only its own records; overview action counts are computed in SQL.
- The prompt assistant uses Gemini with Google Search and URL context. Sources are shown and drafts require review and application before saving.
- Agent credentials are AES-256-GCM encrypted at rest using `INTERNAL_API_KEY`. The voice runtime uses a scoped runtime token rather than a database credential. Rotate the encryption secret only with a credential migration.
- Configuration loads for new calls; tool permissions are also checked on every execution. Restart disconnects calls. CPU/memory and active-call counts come from runtime heartbeats, not simulated GPU inference.
- Meta webhooks require a saved app secret. The stable portal webhook proxies signed events to an HTTPS runtime tunnel. The migrated phone retains its original named Cloudflare tunnel. New agents require their own Meta phone configuration.

## Customer administration

Administrators use `/admin` to list customers and users, create accounts, and
enable each customer's bot features. `portal_users.is_admin` grants this access;
it cannot be changed through the customer API. Existing administrator passwords
are preserved.

Customers with editing disabled see only their own call history and transcripts.
The API blocks their writes and resource access. Customer feature limits also
restrict agent configuration and runtime tool execution. Disabling appointments,
orders, or tickets removes them from the customer's workspace and blocks the tools.

For the website demo, set `DEMO_AGENT_ID` to the active demo agent and configure
the same `DEMO_SIGNING_SECRET` on Netlify and the voice runtime.

## Validation

`pnpm build` and `pnpm lint` validate the portal. The voice runtime uses `uv run ruff check .` for Python validation.

## Deployment

Netlify site `serendibai-portal` builds `pnpm build` from this repository's main branch using the Next.js plugin. Configure secrets in Netlify environment variables. Deploy with `netlify deploy --build --prod --site 3be51ad4-a368-4b12-bf2b-1907eb225079`. The marketing site is a separate project.

Customer self-registration, billing and invitation flows are not enabled. Administrators manage customer access.

The `/onboarding` page connects a WhatsApp account as an experimental linked device. A customer selects an agent and scans the temporary QR code with WhatsApp Business. Disabling AI answering disconnects the service while keeping the paired session for later. The linked-device service runs separately from the production voice runtime and uses the `LINKED_SERVICE_URL` and `LINKED_BRIDGE_SECRET` environment variables. This connection is unofficial and can stop working if WhatsApp changes its protocol.

Administrators create customer access from **Customer access**. The portal creates or assigns the workspace, applies the selected feature permissions, and emails a single-use password setup link that expires after seven days. Customers set their password and go directly to WhatsApp onboarding; workspace pages and data APIs stay locked until the linked-device connection reports `connected`. Invitation mail uses Amazon SES in `ap-south-1` with `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY`, scoped to `notify.serendibai.lk`. Resend a pending invitation from its customer card. SES production sending and the sender domain are verified.

Administrators can invite additional email addresses into an existing workspace; all its users share the configured feature permissions. They can remove individual users or permanently delete a customer workspace and its portal records. Workspace deletion also asks the linked-device service to stop and remove that workspace's local WhatsApp pairing session.
