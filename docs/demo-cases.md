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

Select a case and enter your WhatsApp number with callback consent. The backend
checks WhatsApp call permission and places an outbound call immediately when
permission is already granted. Otherwise it sends the approved
`serendibai_demo_call` permission template and places the selected call after the
recipient accepts. The recipient does not send a confirmation message or initiate
a call. Declines, delivery failures, unanswered calls and expiry appear on the page.
A website checkbox does not replace WhatsApp call permission.

The signed `/cases/call` request uses the existing demo signing secret and is
claimed once by the host runtime. The runtime rechecks Meta permission before
calling and binds the selected case agent to the call. Configuration, tools,
transcripts, usage and private recordings retain that agent and tenant identity.
Requests expire after ten minutes, demo calls last at most five minutes, and the
global runtime call limit applies. Concurrent callback requests for the same
number are rejected. The legacy inbound selector applies only to older inbound
requests and cannot select the persona for an outbound callback.

The page enables registration only when the host runtime has a fresh ready
heartbeat advertising `case_callbacks`. Callback handling stays in the runtime;
these temporary endpoints will be removed from the portal after recording.

The case opening uses a natural business greeting. Consent to AI calling and recording is collected before dialing, so the spoken scene does not announce a demo or recording. Direct questions about AI or the staged company are answered truthfully. The existing
Talent 360 greeting remains unchanged. Each case follows the caller's language.
The recording page supplies a short caller cue. Use fictional details.

| Case | Fictional Sri Lankan company | Scenario |
| --- | --- | --- |
| Support | Luma Clothing | Accept the supplied suit reference, offer priority courier pickup or Bambalapitiya collection, and share tracking |
| Sales | Keleniya Solar | Colombo home with a bill over LKR 20,000; illustrative savings, payback and lender options |
| Operations | Silva Family Clinic | Ask the preferred area, then book at Colombo, Dehiwala or Nugegoda |
| Marketing | Ruhunu Holidays | Agent-led callback about a holiday enquiry and tailored demo package pitch |
| Talent | Talent Sri Lanka | Third-party agency vacancies, sample CV request and recruiter follow-up |

The support tracker at `/cases/order/{reference}` displays the caller-provided reference with the staged suit status: ready at Bambalapitiya, awaiting courier pickup within two days. References must contain 3-30 letters, digits or hyphens. It contains no actual customer data. The caller can request a delivery-partner escalation through the delivery coordinator or collection from the branch.
Remove it with the other temporary demo pages after the recordings are supplied.
The recruitment demo asks for a sample CV in the WhatsApp chat and logs a
follow-up; it does not parse CV files or forward them to actual employers.

Solar figures are illustrative fixtures: LKR 800,000 initial cost and LKR 15,000
modeled monthly savings give about 53 months of simple payback, before financing,
maintenance and other charges. They are not real customer performance claims.
The agent can discuss independently offered financing from
[NDB](https://www.ndbbank.com/personal-banking/loans/solar-vantage-loans),
[DFCC](https://www.dfcc.lk/savings-accounts/solar-loans) and
[HNB](https://hnb.lk/personal/loans/personal-loans), checked on 23 October 2026.
No bank partnership, current interest rate or loan approval is claimed.


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

Voice direction is scoped to these five recording cases: Aoede female timbre with explicit native Sri Lankan English cadence and Sinhala-influenced pronunciation, including Bambalapitiya. A female preset does not by itself verify the accent; audition the generated preview and a fresh WhatsApp recording. Talent 360 retains its existing instructions and greeting.

The case speech configuration now uses the provider-supported `en-IN` regional setting alongside Sri Lankan accent instructions. A full-config Gemini 3.8 Live audition on 23 October 2026 produced English audio classified as Sri Lankan English by an automated audio review, then successfully switched to Sinhala and Tamil. The automated review is not a substitute for a native listener or a fresh WhatsApp call. The host agent, including Talent 360, does not receive this case-only locale setting.
