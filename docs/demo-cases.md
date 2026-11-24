# Demo cases

Demo greetings and system prompts are stored on their `portal_agents` rows and
can be edited from the Voice agents page.

The shared inbound number defaults to Samantha from Talent360 for applicant
qualification. Roma Suits support and Econ Properties qualification are additional
instruction examples; there is no inbound number-based routing.

| Callback route | Solution | Example |
| --- | --- | --- |
| sales | outbound_cx_support | Electronics.lk laptop repair ready for collection |
| talent | lead_qualification | Talent360 applicant screening |
| operations | outbound | Dentist.lk appointment confirmation |
| marketing | outbound | Education webinar enrollment follow-up |

The existing route identifiers are kept to preserve agent and call history. They
identify examples, not the four solution names. Greetings and instructions load
from Neon when each call starts.

Apply `db/cases.sql` to seed or update only these demo agents, case descriptions
and documents. The callback page is `/cases`. It preserves signed requests,
Meta call permission, tenant-scoped tools, private recordings and transcripts.
The support tracker remains at `/cases/order/{reference}`.
