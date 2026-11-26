create table if not exists portal_users (id uuid primary key default gen_random_uuid(), email text unique not null, password_hash text not null, customer_id uuid not null references customers(id), created_at timestamptz not null default now());
alter table portal_users add column if not exists is_admin boolean not null default false;
alter table portal_users add column if not exists display_name text not null default '';
alter table portal_users add column if not exists onboarding_completed boolean not null default false;
alter table customers add column if not exists portal_read_only boolean not null default false;
alter table customers add column if not exists portal_tools text[] not null default array['book_appointment','create_order','create_ticket'];
alter table customers add column if not exists email text;
create table if not exists portal_sessions (token_hash text primary key, user_id uuid not null references portal_users(id) on delete cascade, expires_at timestamptz not null);
create table if not exists portal_setup_tokens (token_hash text primary key, customer_id uuid not null references customers(id), expires_at timestamptz not null);
create table if not exists portal_invitations (user_id uuid primary key references portal_users(id) on delete cascade, token_hash text not null unique, expires_at timestamptz not null, sent_at timestamptz);
create table if not exists portal_rate_limits (key text primary key, attempts integer not null default 1, expires_at timestamptz not null);
create table if not exists portal_agents (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), name text not null, company_name text not null default '', company_url text not null default '', system_prompt text not null default '', text_reply_instructions text not null default '', greeting text not null default '', voice text not null default 'Aoede', languages text[] not null default array['English','Sinhala','Tamil'], tools text[] not null default array['search_knowledge','search_products'], max_calls integer not null default 3 check(max_calls between 1 and 20), phone_number_id text not null default '', credentials text, runtime_token_hash text unique, status text not null default 'draft', version integer not null default 1, deployed_version integer not null default 0, heartbeat_at timestamptz, telemetry jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table portal_agents add column if not exists company_url text not null default '';
alter table portal_agents add column if not exists system_prompt text not null default '';
alter table portal_agents add column if not exists text_reply_instructions text not null default '';
alter table portal_agents add column if not exists greeting text not null default '';
alter table portal_agents add column if not exists voice text not null default 'Aoede';
alter table portal_agents add column if not exists tools text[] not null default array['search_knowledge','search_products'];
alter table portal_agents add column if not exists credentials text;
alter table portal_agents add column if not exists runtime_token_hash text unique;
alter table portal_agents add column if not exists version integer not null default 1;
alter table portal_agents add column if not exists deployed_version integer not null default 0;
alter table portal_agents add column if not exists heartbeat_at timestamptz;
alter table portal_agents add column if not exists telemetry jsonb not null default '{}';
alter table portal_agents add column if not exists created_at timestamptz not null default now();
alter table portal_agents add column if not exists company_name text not null default '';
alter table portal_agents alter column greeting set default '';
alter table portal_agents drop column if exists instance_id;
alter table portal_agents drop column if exists hourly_budget;
alter table portal_agents drop column if exists operation_at;
alter table portal_agents alter column voice set default 'Aoede';
create index if not exists portal_agents_customer on portal_agents(customer_id);
create table if not exists portal_whatsapp_links (customer_id uuid primary key references customers(id), agent_id uuid not null references portal_agents(id), enabled boolean not null default false, status text not null default 'offline', qr text, qr_expires_at timestamptz, error text not null default '', updated_at timestamptz not null default now());
alter table portal_whatsapp_links add column if not exists message_replies_enabled boolean not null default false;
alter table portal_whatsapp_links add column if not exists message_reply_instructions text not null default '';
alter table portal_whatsapp_links add column if not exists voice_enabled boolean not null default true;
alter table portal_whatsapp_links add column if not exists id uuid;
update portal_whatsapp_links set id=customer_id where id is null;
alter table portal_whatsapp_links alter column id set default gen_random_uuid();
alter table portal_whatsapp_links alter column id set not null;
alter table portal_whatsapp_links drop constraint if exists portal_whatsapp_links_pkey;
alter table portal_whatsapp_links add primary key (id);
alter table portal_whatsapp_links add column if not exists phone text not null default '';
create index if not exists portal_whatsapp_links_customer on portal_whatsapp_links(customer_id);
create table if not exists portal_documents (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), name text not null, content text not null, bytes integer not null, type text not null, created_at timestamptz not null default now());
create index if not exists portal_documents_search on portal_documents using gin(to_tsvector('simple',content));
create table if not exists portal_products (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), name text not null, sku text not null default '', description text not null default '', category text not null default 'Product', price numeric check(price >= 0), currency text not null default 'LKR', stock integer check(stock >= 0), status text not null default 'active' check(status in ('active','draft','archived')), updated_at timestamptz not null default now());
alter table portal_products add column if not exists unit text not null default 'unit';
alter table portal_products add column if not exists image bytea;
alter table portal_products add column if not exists image_type text;
create index if not exists portal_products_customer on portal_products(customer_id);
create table if not exists portal_calls (id text primary key, customer_id uuid not null references customers(id), agent_id uuid references portal_agents(id), customer_phone text, status text not null, transcript text, duration_seconds numeric, tokens integer, usage jsonb, events jsonb, recording_url text, source text not null default 'runtime', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table portal_calls add column if not exists usage jsonb;
alter table portal_calls add column if not exists events jsonb;
alter table portal_calls add column if not exists source text not null default 'runtime';
create index if not exists portal_calls_customer_date on portal_calls(customer_id,created_at desc);
create table if not exists portal_text_usage (id text primary key, customer_id uuid not null references customers(id) on delete cascade, agent_id uuid references portal_agents(id) on delete set null, model text not null, usage jsonb not null, created_at timestamptz not null default now());
create index if not exists portal_text_usage_customer_date on portal_text_usage(customer_id,created_at desc);
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  agent_id uuid references portal_agents(id) on delete set null,
  connection_id uuid references portal_whatsapp_links(id) on delete set null,
  contact_phone text not null,
  direction text not null check(direction in ('inbound','outbound')),
  body text not null,
  status text not null check(status in ('received','sent','failed')),
  source text not null check(source in ('linked_device','cloud_api')),
  provider_message_id text,
  reply_to_message_id text,
  model text,
  usage jsonb,
  created_at timestamptz not null default now()
);
create table if not exists portal_message_threads (
  customer_id uuid not null references customers(id) on delete cascade,
  contact_phone text not null,
  category text not null default 'New inquiry' check(category in ('New inquiry','Sales','Support','Product question','Booking','Other')),
  status text not null default 'Open' check(status in ('Open','Waiting','Resolved')),
  updated_at timestamptz not null default now(),
  primary key(customer_id,contact_phone)
);
create index if not exists portal_messages_contact_history on portal_messages(customer_id,contact_phone,created_at desc);
create index if not exists portal_messages_customer_date on portal_messages(customer_id,created_at desc);
create unique index if not exists portal_messages_linked_provider on portal_messages(connection_id,provider_message_id) where connection_id is not null and provider_message_id is not null;
create unique index if not exists portal_messages_cloud_provider on portal_messages(customer_id,provider_message_id) where connection_id is null and provider_message_id is not null;
create table if not exists portal_appointments (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id) on delete cascade, agent_id uuid references portal_agents(id) on delete set null, call_id text not null, customer_phone text not null default '', customer_name text not null, service text not null, appointment_at timestamptz not null, duration_minutes integer not null default 30 check(duration_minutes between 15 and 240), notes text not null default '', status text not null default 'booked' check(status in ('booked','completed','cancelled')), created_at timestamptz not null default now());
create index if not exists portal_appointments_customer_date on portal_appointments(customer_id,appointment_at);
create unique index if not exists portal_appointments_agent_slot on portal_appointments(agent_id,appointment_at) where status='booked';
create table if not exists portal_orders (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id) on delete cascade, agent_id uuid references portal_agents(id) on delete set null, call_id text not null, customer_phone text not null default '', customer_name text not null, items jsonb not null, delivery_address text not null default '', notes text not null default '', status text not null default 'placed' check(status in ('placed','processing','completed','cancelled')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,call_id));
create index if not exists portal_orders_customer_date on portal_orders(customer_id,created_at desc);
create table if not exists portal_tickets (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id) on delete cascade, agent_id uuid references portal_agents(id) on delete set null, call_id text not null, customer_phone text not null default '', customer_name text not null, subject text not null, description text not null, priority text not null default 'normal' check(priority in ('low','normal','high','urgent')), status text not null default 'open' check(status in ('open','in_progress','resolved','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,call_id));
create index if not exists portal_tickets_customer_date on portal_tickets(customer_id,created_at desc);
create table if not exists portal_events (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), agent_id uuid references portal_agents(id), action text not null, detail text not null, created_at timestamptz not null default now());
create index if not exists portal_events_customer_date on portal_events(customer_id,created_at desc);
create table if not exists portal_outbound_batches (id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers(id), agent_id uuid not null references portal_agents(id), name text not null, instructions text not null, columns jsonb not null, headers jsonb not null, created_at timestamptz not null default now());
alter table portal_outbound_batches add column if not exists source_hash text;
create index if not exists portal_outbound_batches_source on portal_outbound_batches(customer_id,source_hash,created_at desc);
create table if not exists portal_outbound_rows (id uuid primary key default gen_random_uuid(), batch_id uuid not null references portal_outbound_batches(id) on delete cascade, phone text not null, data jsonb not null, result jsonb, created_at timestamptz not null default now());
create index if not exists portal_outbound_rows_batch on portal_outbound_rows(batch_id,created_at);
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

alter table portal_outbound_batches add column if not exists max_retries integer not null default 0;
alter table portal_outbound_batches add column if not exists retry_hours integer not null default 24;
alter table portal_case_requests add column if not exists retries_used integer not null default 0;
alter table portal_case_requests add column if not exists retry_at timestamptz;
alter table portal_outbound_batches drop constraint if exists portal_outbound_batches_retry_hours_check;
update portal_outbound_batches set retry_hours=least(336,greatest(24,ceil(retry_hours / 24.0)::int * 24)) where retry_hours<24 or retry_hours>336 or retry_hours % 24<>0;
alter table portal_outbound_batches add constraint portal_outbound_batches_retry_hours_check check(retry_hours between 24 and 336 and retry_hours % 24=0);
