# Demo cases

The four main solutions are `inbound_cx_support`, `outbound_cx_support`,
`lead_qualification` and `outbound`. Their general prompts live in
`voice-agent/app/solution_prompts.py`. Example instructions and fixed demo
identities live in `voice-agent/app/case_prompt.py`.

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
identify examples, not the four solution names. Callbacks start in English
without a language selector; incoming calls offer English, Sinhala or Tamil.

Apply `db/cases.sql` to seed or update only these demo agents, case descriptions
and documents. The callback page is `/cases`. It preserves signed requests,
Meta call permission, tenant-scoped tools, private recordings and transcripts.
The support tracker remains at `/cases/order/{reference}`.
