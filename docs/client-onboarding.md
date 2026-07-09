# SerendibAI Dashboard Client Onboarding

This runbook prepares a new customer workspace for the SerendibAI managed WhatsApp voice-agent dashboard.

## 1. Confirm Client Inputs

Collect these before provisioning:

- Business name, primary contact, billing email, and support phone number.
- WhatsApp Business Account ID, phone number ID, and display phone number.
- Supported languages for the agent: English, Sinhala, Tamil, or a subset.
- Escalation rules, after-hours policy, booking fields, and follow-up recipients.
- Agent prompt notes: business facts, operating hours, services, pricing caveats, and handoff triggers.
- Subscription plan: Starter, Growth, or Scale.

## 2. Provision Environment

Set these variables in local development, Netlify, or the production process manager:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require&channel_binding=require"
NEON_AUTH_BASE_URL="https://YOUR_NEON_AUTH_URL/neondb/auth"
NEON_AUTH_COOKIE_SECRET="$(openssl rand -base64 32)"
```

If `DATABASE_URL` is missing, the dashboard intentionally falls back to deterministic mock data for demos and screenshots.

## 3. Prepare Neon Data

The dashboard expects these core tables:

- `customers`
- `whatsapp_numbers`
- `agent_configs`
- `calls`
- `subscription_plans`
- `customer_subscriptions`
- `usage_events`

Billing tables are created and seeded automatically by the dashboard when `DATABASE_URL` is present. Link a Neon Auth user to a customer:

```sql
alter table customers add column if not exists auth_user_id text unique;

update customers
set auth_user_id = 'neon-auth-user-id'
where id = 'customer-id';
```

Grant admin access through the Neon Auth user role:

```sql
update neon_auth."user"
set role = 'admin'
where email = 'admin@example.com';
```

## 4. Connect The Voice Runtime

The `sl-chatbot` runtime should remain the source of live call events. Do not modify that repo from dashboard onboarding work. Configure the runtime to write call lifecycle data into the same Neon database:

- Create or update a `calls` row when WhatsApp sends a call connect event.
- Store caller phone, WhatsApp number ID, status, transcript, recording URL, and timestamps.
- Insert token usage into `usage_events` with `event_type = 'tokens'`.
- Keep model, ASR, TTS, and turn-control settings in the voice runtime.

## 5. Create Customer Access

Use `/admin` with an admin account:

1. Add the customer email and business details.
2. Select the subscription plan.
3. Send the password reset email.
4. Confirm the user can set a password and sign in at `/login`.
5. Confirm `/dashboard` only shows the customer linked to that auth user.

## 6. Route Verification

Verify these paths before handing the workspace to a client:

- `/login` - customer sign-in and forgot-password link.
- `/forgot-password` - reset request screen.
- `/reset-password` - Neon Auth reset completion.
- `/dashboard` - overview metrics, quotas, chart, agent setup, recent calls.
- `/dashboard/calls` - mobile call cards and desktop table.
- `/dashboard/agent` - live agent languages, prompt, and WhatsApp number.
- `/dashboard/customers` - business and auth mapping.
- `/dashboard/settings` - plan, calls, token usage, and subscription update form.
- `/admin` - user creation, reset emails, plan assignment, and customer management.
- `/admin/customers/:customerId` - individual customer workspace review.

Run the checks on desktop and a phone-width viewport. The calls page should not require horizontal scrolling on mobile.

## 7. Handoff Checklist

Before onboarding is considered complete:

- Client name, WhatsApp number, plan, and contact details are accurate.
- Agent prompt reflects the client business and avoids demo-only examples.
- Sinhala, Tamil, and English behavior has been smoke-tested if enabled.
- At least one test call appears with a transcript and expected status.
- Escalation and after-hours handling match the signed-off rules.
- Admin account is restricted to SerendibAI operators.
- Customer user has completed password setup.
- Netlify environment variables are set outside the repo.
- Screenshots have been checked for desktop and mobile layout quality.

