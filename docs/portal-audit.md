# Portal and database audit — 31 October 2026

## Scope and conclusion

Reviewed all portal pages, components, API handlers, authentication, imports/exports, runtime integration, schema and migration files; inspected live Neon table counts, foreign keys and indexes; checked the signed-in production UI at desktop and mobile widths. Cross-checked database consumers in the voice runtime and marketing repository.

The main simplification opportunity was unused presentation code and excessive data loading, rather than combining business records into a generic JSON table. The database is small: 369 calls, eight agents and five customers at inspection. Separate orders, bookings and tickets retain useful validation and distinct lifecycles.

## Findings and applied changes

| Area | Finding | Change |
| --- | --- | --- |
| Mobile catalogue | Import buttons forced introductory text into a narrow vertical column | Wrap the banner; give its description a full mobile row and keep buttons aligned below it |
| Hidden file inputs | Generic input styles overrode visually hidden field sizing and caused horizontal overflow | Exclude visually hidden controls from generic input styles |
| Shared controls | Small mobile buttons, cramped filters, rigid action rows, shrinking icons | Consistent minimum heights, wrapping actions, flexible searches and nonshrinking icons |
| Agent settings | Mobile save controls stacked awkwardly | Allow status and save controls to wrap together |
| Styling | Old analytics, capacity, activity and decorative selectors remained after their UI disappeared | Removed 137 unused rules; removed hidden decorative markup and unused scaffold assets |
| Records | Borders referenced an undefined `--line` variable | Reuse the existing border token |
| Data loading | Every page fetched 12 queries, including all major business record types and unused daily/quotas/events payloads | Fetch only section records; retain shared agent metadata; 2–5 queries per section |
| Payload exposure | Read-only accounts received agent telemetry; other pages received prompts and connection fields unnecessarily | Return prompts, phone IDs and telemetry only on the editable agent page |
| Overview totals | Attention counters were computed from capped record lists | Use SQL counts independently of the record display limits |
| Date filters | SQL used the database's midnight while the UI displayed Sri Lanka dates | Anchor date boundaries to Asia/Colombo |
| Navigation | Local component state could persist across section changes | Key the portal by section |
| Status updates | UI used PATCH, but the route exported no PATCH handler | Export the existing handler; retain enum, permission and tenant validation |
| Agent removal | Hard deletion collided with demo and outbound foreign keys | Archive configurations, revoke runtime tokens and retain history and relationships |
| Runtime archive | Direct database heartbeats could reactivate an archived agent | Existing heartbeat UPDATE now excludes archived agents |
| Voice configuration | Database tools repeated the default already provided by the voice service | Removed redundant import and value; total voice change is two fewer lines and 36 fewer bytes |
| Prompt editor | Hosted demo prompts are managed in voice-agent, not loaded from `portal_agents.system_prompt` | State this limitation in the editor and use an accurate save confirmation; preserve current demo behavior |
| Product imports | Ownership checks made one query per existing item | Validate all IDs with one tenant-scoped query before the transaction |
| Outbound import | Batch creation committed before row insertion | Insert batch and rows in one transaction |
| CSV headers | Browser validated duplicate/blank headings, server did not | Validate both on the server before generating fields or writing data |
| Generated fields | AI could return duplicate result column names | Deduplicate validated column names |
| Callback reservation | Pending requests were eligible for replacement by another request | Include pending in the protected active states for outbound and case callbacks |
| Callback failure | Failed runtime dispatch still returned success | Return a 502 with explicit status-refresh guidance |
| CSV export | Call export missed formula prefixes after leading whitespace | Match the outbound export's whitespace-aware escaping |
| Session storage | 34 expired sessions and 44 expired rate-limit entries remained at inspection | Successful logins remove expired entries transactionally; active limits and sessions are retained |
| Webhook signing | An empty app secret skipped signature enforcement | Reject unconfigured webhooks; retain configured legacy-number app-secret fallback |
| Runtime URLs | Heartbeat validation rejected the named production domain accepted elsewhere | Reuse the existing runtime URL allowlist |
| Migration safety | Migration seeded a hard-coded admin with a fallback password, rewrote voices, dropped old tables and referenced case tables before defining them | Schema-only transaction; correct dependency order; remove implicit account creation, voice rewriting and legacy drops |
| Dependencies | Four packages had no application imports | Removed class-variance-authority, clsx, tailwind-merge and agent-browser |

## Database inventory and reduction

Exact counts at inspection, before maintenance. `public` had 30 tables; `neon_auth` had nine managed tables.

| Tables | Rows | Decision |
| --- | --- | --- |
| customers / portal_users | 5 / 2 | Keep tenant and login boundaries |
| portal_sessions / portal_rate_limits | 35 / 45 | Keep; expire and clean rather than mix authentication with other data |
| portal_agents / portal_calls | 8 / 369 | Keep configurations and call history |
| portal_documents / portal_products | 4 / 12 | Keep searchable text and structured catalogue data |
| portal_appointments / portal_orders / portal_tickets | 7 / 2 / 5 | Keep distinct constraints and runtime contracts |
| portal_events | 69 | Keep audit history and runtime writes; stop downloading it unnecessarily |
| portal_agent_cases / portal_case_requests | 5 / 2 | Keep active demo routing and callback reservations |
| portal_outbound_batches / portal_outbound_rows | 2 / 4 | Keep batch instructions separate from per-contact data; no empty batches found |
| portal_quotas | 3 | Remove unused table and API: all rows contain the same uncustomized defaults; no enforcement or current UI consumes it |
| portal_demo_requests | 5 | Retain historical records; stop recreating this retired table in the current schema |
| agent_configs / whatsapp_numbers | 1 / 1 | Retain legacy configuration and business-number history |
| customer_subscriptions / subscription_plans / usage_events | 3 / 3 / 5 | Retain commercial/history records; no active portal consumer found |
| real_estate_properties / property_appointments | 16 / 10 | Retain prior domain data and appointment relationships |
| fine_tuning_runs / fine_tuning_artifacts / fine_tuning_run_notes / fine_tuning_listening_notes | 1 / 4 / 3 / 1 | Retain training provenance outside portal scope |
| client_onboarding | 0 | No active consumer found in these repos; ownership outside the portal is unverified, so retain |
| neon_auth tables | 9 tables | Managed authentication schema; leave intact |

`db/simplify.sql` removes only `portal_quotas`, after the new portal is published. It takes a table lock and aborts if any non-default allowance exists. It is idempotent. No business records, transcripts, training data or managed-auth records are removed. Result: 29 public tables, 16 portal-prefixed tables, zero new tables.

Rollback, if ever needed: restore the quota table definition from the preceding Git revision and seed default rows for the required customers before restoring an old application version. No customized quota values existed in the inspected database.

## Improvements deliberately not added

- Server-side conversation search, pagination and full-period exports: worthwhile once the 100-call window is restrictive. The current UI explicitly labels that limit. This requires coordinated API/UI work rather than silently exporting a partial history as complete.
- Historical outbound attempts: the existing unique `(runtime_agent_id, phone)` reservation is reused. A later call can replace an earlier row's status link. Fixing this fully needs a durable attempt model or moving attempt metadata onto existing outbound rows. Do not drop the reservation table or pretend historical outcomes are complete.
- Overlapping appointments: the current unique index blocks identical start times, not overlapping durations. A range exclusion constraint needs existing-data review, business rules and aligned runtime conflict handling.
- Arbitrary per-agent prompt editing for the hosted demo runtime: this is a product behavior change; current scripts deliberately separate inbound registration and outbound qualification. The limitation is now visible instead of promising that a save changes these calls.
- Further table consolidation: merging orders/tickets/appointments into JSON would remove constraints while adding branching code. Consolidating sessions/rate limits would mix different security lifecycles. Neither simplifies the working system.
- Removing historical tables: no active consumer in these three repositories is not proof that historical data can be discarded. Export/archive and establish ownership before retirement.
- Additional indexes: current tables are tiny and existing tenant/date and uniqueness indexes cover the main queries. Avoid speculative index growth; measure query plans as data grows.
- Password lifecycle and CSP nonces: account recovery, forced credential rotation and stricter script policy need a cohesive authentication change. This audit removes unsafe migration defaults without changing existing passwords or adding another auth system.
- Catalogue bulk editing still accepts up to 500 rows per write while reads are capped at 2,000. Large-catalogue pagination/editing should be designed together; current live catalogue has 12 rows.

## Verification

- Portal ESLint and production build passed; voice Ruff passed. No test suite was added.
- Authenticated local production server: all eight customer sections returned HTTP 200 for both API and page; irrelevant calls and sensitive agent fields were absent from section payloads.
- API boundaries: anonymous 401, non-admin customer administration 403, foreign-origin mutation 403, invalid section/status 400, missing and cross-tenant ticket updates 404.
- Voice commit `2d2eaaa` passed production deployment workflow `41126755495`.
- One-off disposable records verified successful persisted PATCH updates for orders, tickets and appointments, archival with foreign-key references, and read-only mutation blocking. All temporary records were removed.
- Portal published to Netlify; guarded quota removal completed, leaving 29 public tables. Removed 34 expired sessions and 44 expired rate-limit entries. Live voice heartbeat was ready and fresh.
- Live mobile catalogue inspection confirmed corrected banner and toolbar wrapping; final responsive checks are recorded in the task handoff.
- No real WhatsApp call was placed. Deployment/static checks do not prove caller-heard behavior or an end-to-end outbound results CSV.
