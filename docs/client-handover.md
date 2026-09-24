# Client handover readiness

## Ready in the portal

- Calls, transcripts, agent settings, knowledge files and catalogue entries are stored in the customer workspace.
- A voice call can create an order request, support ticket or appointment when that tool is enabled for the agent.
- Staff can track orders through placed, processing, completed or cancelled; tickets through open, in progress, resolved or closed; and appointments through booked, completed or cancelled.
- Those status changes update the portal record. They do not fulfil an order, send it to a commerce system, or sync it to an external calendar or helpdesk.
- The portal's own records are the usable starting option when the client has no existing system or wants staff to manage these requests in SerendibAI.

## Recommended system choices

Start by asking the client which system owns each workflow. Connect only the systems they already use.

| Workflow | First choice | What a real connection needs |
| --- | --- | --- |
| Support | Zendesk | A SerendibAI global OAuth app, the client's Zendesk admin authorization, narrow ticket and user scopes, call-to-ticket ID mapping, and webhook-based status updates. Zendesk says distributed integrations must use global OAuth and must not ask clients to share personal API credentials. [Authentication guidance](https://developer.zendesk.com/api-reference/introduction/security-and-auth/), [ticket API](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/). |
| Appointments | Google Calendar or Microsoft 365 | The client authorizes the target calendar. Check free/busy before confirming, store the external event ID, and sync cancellation/rescheduling back to the portal. Google event creation requires calendar OAuth scopes; Microsoft Graph supports creating calendar events with `Calendars.ReadWrite`. [Google Calendar events](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Microsoft Graph events](https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0). |
| Commerce | Shopify | The store owner installs/authorizes an app with only required product and `write_draft_orders` scopes. Search the real catalogue and create a reviewable draft order first; Shopify creates an order only after the merchant accepts payment. Store draft/order IDs and sync changes through webhooks. [Authentication](https://shopify.dev/docs/api/usage/authentication), [draftOrderCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftordercreate). |
| CRM | HubSpot | Prefer the current developer platform and date-versioned APIs. For client-wide webhook sync, create a distributable OAuth app and have each HubSpot admin authorize it; avoid new work on deprecated v1 OAuth endpoints. [Current API reference](https://developers.hubspot.com/docs/api-reference/latest/overview), [app installation and webhooks](https://developers.hubspot.com/docs/apps/legacy-apps/public-apps/overview). |

Calendly can be considered when the client already uses it, but confirm plan eligibility first: its documentation says webhook access requires Premium or above. For Salesforce, new OAuth work should use External Client Apps; creation of new Connected Apps is restricted as of Spring '26. [Calendly API](https://developer.calendly.com/docs/getting-started/introduction), [Salesforce OAuth guidance](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html).

## Not connected yet

No CRM, helpdesk, commerce or external-calendar connector is currently active. The database and portal workflow do not prove that an external system received or updated a record. Before calling a connector "connected," implement tenant-scoped OAuth, encrypted token storage, field mapping, stable call-to-external-record IDs, retryable delivery, inbound status sync, and a visible failure state. Don't collect client API tokens in chat or put them in agent prompts.

## Client setup checklist

Before a real client launch, collect through an approved secure channel:

- A Meta Business Portfolio admin who can connect the client's own WhatsApp Business number and approve the display name, webhook and required permissions.
- The chosen workflow source for orders, support and appointments, plus an account owner/admin who can authorize the relevant OAuth app.
- The business hours, escalation contact, supported languages, appointment duration and working calendar, and order/ticket handling rules.
- Approved knowledge files, current products/prices/availability, a reviewed greeting and voice prompt, and the client's data-retention and recording notice requirements.
- A named staff owner for each queue and a person who can test one real call and confirm the resulting transcript and records.

Do not reuse the SLT demo's WhatsApp number or catalogue as a client's production account. Ask the client to confirm whether SerendibAI should retain the portal as the source of truth or build and verify a connector to their selected system.
