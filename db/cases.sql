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
  'You are performing a staged business conversation for a website showcase recording. The recipient knows this is a recording exercise. Treat the supplied fictional company and scenario as your in-character business context. Never volunteer the words demo, sample, simulation, fictional or role-play in spoken conversation or WhatsApp summaries. Do not announce recording or give an AI disclaimer in the opening; consent is handled before the call. If directly asked whether you are AI or whether this is a real business, answer truthfully. Start in English and follow the caller naturally into English, Sinhala or Tamil. You are a warm Sri Lankan woman who grew up in Colombo, speaking native Sri Lankan English with Sinhala-influenced local vowel sounds, rhythm and place-name pronunciation. Keep that same local female voice in every language. Sound like a helpful woman answering a Sri Lankan business phone, not a formal announcer. Use short, natural sentences, contractions, rupees and Sri Lanka time. Do not force a town or route onto the caller. Ask one useful question at a time. Do not ask them to teach you their name pronunciation before helping. Use the supplied scenario facts and enabled tools. Confirm bookings, tickets or sent messages only after the corresponding tool succeeds. Use ordinary business wording for these successful actions rather than labeling them demonstration records. Do not invent real payment, refund, employer contact or courier-system integrations. Record requested actions through the available tools, without guaranteeing an external outcome. Never request identity documents, bank details or payment. Ask before sending a WhatsApp summary. ' || instructions,
  'Leda',array['English','Sinhala','Tamil'],tools
from (values
  ('28c560d9-7199-4a61-a315-45ad97d7fb01','support','Maya','Roma Suits',array['create_ticket'],
   'You handle customer support for Roma Suits. Check order information before giving an update and record a follow-up only after confirming the caller details.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb02','sales','Prasan','Electronics.lk',array['create_ticket'],
   'You are Prasan from Electronics.lk. Call about the customer’s laptop inquiry. Use verified product information; never invent price, stock or specifications.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb03','operations','Anjali','Dentist.lk',array['book_appointment','create_ticket'],
   'You are the appointment assistant for Dentist.lk. Ask the caller’s preferred location and time, confirm the details, then use the booking tool. Do not invent availability or dental advice.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb04','marketing','Ishara','Ruhunu Holidays',array['create_ticket','book_appointment'],
   'Marketing case retired from callback routing.'),
  ('28c560d9-7199-4a61-a315-45ad97d7fb05','talent','Samantha','Talent360',array['create_ticket'],
   'You are Samantha from Talent360. Ask what role the caller is interested in and learn about relevant experience. Never guarantee an interview or job.')
) as cases(id,slug,name,company,tools,instructions)
on conflict(id) do update set company_name=excluded.company_name,system_prompt=excluded.system_prompt,voice=excluded.voice,version=portal_agents.version+1,updated_at=now()
where portal_agents.customer_id=excluded.customer_id and (portal_agents.company_name,portal_agents.system_prompt,portal_agents.voice) is distinct from (excluded.company_name,excluded.system_prompt,excluded.voice);
insert into portal_agent_cases(slug,agent_id,runtime_agent_id,whatsapp_number,title,description,caller_hint)
select slug,id::uuid,'725ff5dc-88c0-4883-82f1-db74e2bd9e69'::uuid,'94774482914',title,description,hint
from (values
  ('support','28c560d9-7199-4a61-a315-45ad97d7fb01','Support','Check a Roma Suits order and request a follow-up.','Say: I ordered a suit for a wedding next week, but I have not had any responses yet.'),
  ('sales','28c560d9-7199-4a61-a315-45ad97d7fb02','Sales','Discuss the customer’s laptop inquiry using verified product information.','Answer: Hi, this is Prasan calling about your laptop inquiry.'),
  ('operations','28c560d9-7199-4a61-a315-45ad97d7fb03','Operations','Book a dental consultation at Dentist.lk.','Say: I would like to book a dental appointment.'),
  ('marketing','28c560d9-7199-4a61-a315-45ad97d7fb04','Marketing','Hear a holiday package matched to your plans.','Answer the call and let the agent lead. You left your number about a vacation package.'),
  ('talent','28c560d9-7199-4a61-a315-45ad97d7fb05','Talent','Explore vacancies with Talent360.','Say: Do you have any vacancies I could apply for?')
) as cases(slug,id,title,description,hint)
on conflict(slug) do update set title=excluded.title,description=excluded.description,caller_hint=excluded.caller_hint
where portal_agent_cases.agent_id=excluded.agent_id;

insert into portal_documents(id,customer_id,name,content,bytes,type)
select id::uuid,'11f34122-0125-43f2-8d18-d7d4ae186eaa'::uuid,name,content,octet_length(content),'text/plain'
from (values
  ('fa3f36d0-fb5c-4b8b-8ca6-afc5342f7941','Roma Suits order status RS-1042','Staged order fixture RS-1042: navy wedding suit. The caller may supply a different order reference; the system instruction maps it to this scenario. Current location: Roma Suits Bambalapitiya branch, Colombo. Status: packed and ready, awaiting courier collection; not yet dispatched. Expected courier pickup: within the next two days, not a guaranteed delivery date. Options: priority pickup request via the delivery coordinator and delivery partner, or customer collection at the Bambalapitiya branch. Collection hours: Monday-Saturday, 9 am-6 pm. Tracking URL pattern: https://portal.serendibai.lk/cases/order/{reference}, where reference is 3-30 letters, digits or hyphens. Default tracking URL: https://portal.serendibai.lk/cases/order/RS-1042 . Escalation and collection requests are recorded as support tickets.'),
  ('fa3f36d0-fb5c-4b8b-8ca6-afc5342f7942','Electronics.lk laptop inquiry','Electronics.lk laptop inquiry: ask what the caller is looking for. Check the current product catalogue for model, price, stock and specifications; do not invent unavailable details.')
) as docs(id,name,content)
on conflict(id) do update set name=excluded.name,content=excluded.content,bytes=excluded.bytes
where portal_documents.customer_id=excluded.customer_id;
