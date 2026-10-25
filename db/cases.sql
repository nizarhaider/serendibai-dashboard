create table if not exists portal_agent_cases (
  slug text primary key check(slug in ('support','sales','operations','marketing','talent')),
  agent_id uuid unique not null references portal_agents(id),
  runtime_agent_id uuid not null references portal_agents(id),
  whatsapp_number text not null,
  title text not null,
  description text not null,
  caller_hint text not null
);
create table if not exists portal_case_requests (
  id text primary key,
  phone text not null,
  case_slug text not null references portal_agent_cases(slug),
  runtime_agent_id uuid not null references portal_agents(id),
  state text not null default 'pending',
  direction text not null default 'inbound',
  message_id text,
  error text not null default '',
  call_id text unique,
  expires_at timestamptz not null default now()+interval '10 minutes',
  created_at timestamptz not null default now(),
  unique(runtime_agent_id,phone)
);
alter table portal_case_requests alter column case_slug drop not null;
alter table portal_case_requests add column if not exists outbound_row_id uuid references portal_outbound_rows(id);
alter table portal_case_requests drop constraint if exists portal_case_requests_state_check;
alter table portal_case_requests add column if not exists direction text not null default 'inbound';
alter table portal_case_requests add column if not exists message_id text;
alter table portal_case_requests add column if not exists error text not null default '';
insert into customers(id,business_name,contact_name,portal_tools)
values('11f34122-0125-43f2-8d18-d7d4ae186eaa','SerendibAI Demo Studio','SerendibAI',array['book_appointment','create_order','create_ticket'])
on conflict(id) do nothing;
insert into portal_quotas(customer_id) values('11f34122-0125-43f2-8d18-d7d4ae186eaa') on conflict do nothing;
insert into portal_agents(id,customer_id,name,company_name,system_prompt,voice,languages,tools)
select id::uuid,'11f34122-0125-43f2-8d18-d7d4ae186eaa'::uuid,name,company,
  instructions,
  'Leda',array['English','Sinhala','Tamil'],tools
from (values
  ('28c560d9-7199-4a61-a315-45ad97d7fb01','support','Maya','Roma Suits',array['create_ticket'],'You are Maya from Roma Suits. Check suit-order inquiries with search_knowledge. Offer a delivery follow-up or branch collection and log agreed requests with create_ticket.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb02','sales','Prasan','Electronics.lk',array['create_ticket'],'You are Prasan from Electronics.lk. The customer''s laptop repair is complete and ready for collection. Ask when they plan to collect it. Check collection details with search_knowledge; do not invent opening hours, charges or an address.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb03','operations','Anjali','Dentist.lk',array['create_ticket','book_appointment'],'You are Anjali from Dentist.lk. Confirm the customer''s existing appointment details and record their response with create_ticket. Do not invent a date or time, or claim an appointment was changed or cancelled.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb04','marketing','Ishara','Education team',array['create_ticket'],'You are Ishara from the education team. Ask whether the customer is interested in enrolling full time after registering for the webinar. Learn their course interests and record an agreed admissions follow-up with create_ticket. Do not invent course fees, dates or admission guarantees.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb05','talent','Samantha','Talent360',array['create_ticket'],'You are Samantha from Talent360. Qualify applicants by asking their name, role applied for, relevant experience and availability. Confirm the summary and use create_ticket to record it for the recruiter. Do not promise a job or claim the recruiter received it before the tool succeeds.')
) as cases(id,slug,name,company,tools,instructions)
on conflict(id) do update set name=excluded.name,company_name=excluded.company_name,system_prompt=excluded.system_prompt,voice=excluded.voice,tools=excluded.tools,version=portal_agents.version+1,updated_at=now()
where portal_agents.customer_id=excluded.customer_id and (portal_agents.name,portal_agents.company_name,portal_agents.system_prompt,portal_agents.voice,portal_agents.tools) is distinct from (excluded.name,excluded.company_name,excluded.system_prompt,excluded.voice,excluded.tools);
insert into portal_agent_cases(slug,agent_id,runtime_agent_id,whatsapp_number,title,description,caller_hint)
select slug,id::uuid,'725ff5dc-88c0-4883-82f1-db74e2bd9e69'::uuid,'94774482914',title,description,hint
from (values
  ('support','28c560d9-7199-4a61-a315-45ad97d7fb01','Inbound CX support','Resolve a Roma Suits order inquiry.','Ask about your suit order.'),
  ('sales','28c560d9-7199-4a61-a315-45ad97d7fb02','Outbound CX support','Your laptop repair is complete and ready for collection.','Answer the callback and respond to the agent.'),
  ('operations','28c560d9-7199-4a61-a315-45ad97d7fb03','Outbound · Appointment confirmation','Confirm an existing dental appointment.','Answer the callback and respond to the agent.'),
  ('marketing','28c560d9-7199-4a61-a315-45ad97d7fb04','Outbound · Webinar follow-up','Follow up on webinar registration and full-time enrollment interest.','Answer the callback and respond to the agent.'),
  ('talent','28c560d9-7199-4a61-a315-45ad97d7fb05','Lead qualification · Recruitment','Qualify a job applicant and record a recruiter summary.','Answer the callback and respond to the agent.')
) as cases(slug,id,title,description,hint)
on conflict(slug) do update set title=excluded.title,description=excluded.description,caller_hint=excluded.caller_hint
where portal_agent_cases.agent_id=excluded.agent_id;

insert into portal_documents(id,customer_id,name,content,bytes,type)
select id::uuid,'11f34122-0125-43f2-8d18-d7d4ae186eaa'::uuid,name,content,octet_length(content),'text/plain'
from (values
  ('fa3f36d0-fb5c-4b8b-8ca6-afc5342f7941','Roma Suits order status RS-1042','Staged order fixture RS-1042: navy wedding suit. The caller may supply a different order reference; the system instruction maps it to this scenario. Current location: Roma Suits Bambalapitiya branch, Colombo. Status: packed and ready, awaiting courier collection; not yet dispatched. Expected courier pickup: within the next two days, not a guaranteed delivery date. Options: priority pickup request via the delivery coordinator and delivery partner, or customer collection at the Bambalapitiya branch. Collection hours: Monday-Saturday, 9 am-6 pm. Tracking URL pattern: https://portal.serendibai.lk/cases/order/{reference}, where reference is 3-30 letters, digits or hyphens. Default tracking URL: https://portal.serendibai.lk/cases/order/RS-1042 . Escalation and collection requests are recorded as support tickets.'),
  ('fa3f36d0-fb5c-4b8b-8ca6-afc5342f7942','Electronics.lk repair collection','The customer’s laptop repair at Electronics.lk is complete and ready for collection. No collection address, opening hours or repair charge is supplied. Do not invent these details; record a follow-up request if needed.')
) as docs(id,name,content)
on conflict(id) do update set name=excluded.name,content=excluded.content,bytes=excluded.bytes
where portal_documents.customer_id=excluded.customer_id;
