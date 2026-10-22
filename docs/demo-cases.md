# Demo cases

The temporary recording setup is at `/cases`. These five one-off agents are for
the website showcase, not a customer portal feature. Remove the demo pages and
portal integration after the owner supplies the recordings. The final website
will play approved clips and offer an opt-in callback for the selected case.
Talent 360's agent, prompt, tools and customer are unchanged.
The existing WhatsApp runtime transports both ordinary and selected demo calls.

Apply `db/cases.sql` as one PostgreSQL migration before deploying the runtime or
portal. It creates the tables and seeds the five agents idempotently. It does not
update other agents; reruns update only the five seeded demo companies and prompts.
The SQL uses the existing runtime agent and public
WhatsApp number; change the case mappings when moving to a different number.

Select a case and enter your WhatsApp number. Send the generated `CASE` message
from that number, then place a WhatsApp voice call in the same chat. Confirmation
activates the selection for ten minutes. It is consumed by one incoming call;
the next call uses the ordinary agent unless another case is selected. A new
selection replaces the previous selection for that number. Demo calls last at
most five minutes. The page only enables registration when the host runtime has
a fresh ready heartbeat advertising `case_routing`.

The caller's number, confirmation token and latest selection are stored in
`portal_case_requests`. The verified Meta webhook binds the token to its actual
sender. Agent configuration, tools, call transcripts, usage and recordings retain
the selected case's tenant and agent identity. Calls without a confirmed selection
retain the host agent. Demo tool actions write demo records, not real transactions.
The global runtime call limit still applies.

The English opening identifies the selected AI demo and recording. The existing
Talent 360 greeting remains unchanged. Each case follows the caller's language.
The recording page supplies a short caller cue. Use fictional details.

| Case | Fictional Sri Lankan company | Scenario |
| --- | --- | --- |
| Support | Weraluma Clothing | Colombo-to-Kandy clothing delivery |
| Sales | Kelaniyara Solar | Rooftop solar enquiry in Peradeniya |
| Operations | Suwaneliya Family Clinic | Appointment at a Nugegoda clinic |
| Marketing | Ruhunara Holidays | Feedback and domestic holiday planning |
| Talent | Nilawera Hospitality | Guest relations interview in Galle |

Full call MP3s are archived through the existing private S3 path. Administrators
can read the demo transcripts at `/cases/transcripts`. The showcase player is the next
stage: record and select a clip for each case, then add synchronized transcript
playback. No unreviewed call is automatically published.

## Reference review

Reviewed all 20 full conversations supplied in the page data for
[ElevenLabs Agents](https://elevenlabs.io/agents), on 22 October 2026. Ten examples
contain audio with word-timed transcripts; ten use text conversations. These notes
summarize the patterns; the new agent instructions use original wording and
fictional fixtures.

| Category | Reference examples and patterns |
| --- | --- |
| Support | Order Support checks an order, explains a delivery delay and addresses a refund request. Triage gathers outage impact and context before escalation. Front Desk prioritizes an active property leak and asks about electrical risk. FAQ explains export limitations and an alternative to cancelling. |
| Sales | Outreach identifies why an application stalled and offers a checklist. Qualification gathers use case, call volume and launch date before a meeting. Booking confirms a visit slot and arrival details. Upsell identifies usage pressure and hands pricing to an account manager. |
| Operations | Scheduling offers alternatives and confirms a changed appointment. Claims gathers incident details and evidence before a reference. Verification compares submitted identity details. Collections acknowledges an overdue balance and agrees a follow-up date. |
| Marketing | Campaign introduces a relevant offer and a checkout next step. Win-back listens to a reason for leaving and offers a low-pressure demo. Feedback discovers a sizing issue and offers an exchange. Research asks for a recommendation score, then follows the underlying problem. |
| Talent | Screening asks about shifts, relevant experience and location. Training runs a difficult-customer role-play and gives focused feedback. Interview explores a specific experience with follow-up questions. Onboarding checks access and clarifies first-week expectations. |

The SerendibAI cases use these conversational patterns while restricting claims to
implemented tools: demo bookings, demo tickets, knowledge/catalogue search and
consented WhatsApp summaries. Refunds, transfers, payments, rescheduling, identity
verification and hiring decisions are not claimed as completed actions.
