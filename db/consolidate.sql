alter table serendib_inbound.customers set schema public;
alter table serendib_inbound.portal_agents set schema public;
alter table serendib_inbound.portal_agent_cases set schema public;
alter table serendib_inbound.portal_calls set schema public;

alter table public.customers add column if not exists portal_read_only boolean not null default false;
alter table public.portal_agents add column if not exists company_url text not null default '';
alter table public.portal_agents add column if not exists system_prompt text not null default '';
alter table public.portal_agents add column if not exists greeting text not null default '';
alter table public.portal_agents add column if not exists voice text not null default 'Aoede';
alter table public.portal_agents add column if not exists credentials text;
alter table public.portal_agents add column if not exists runtime_token_hash text unique;
alter table public.portal_agents add column if not exists created_at timestamptz not null default now();
alter table public.portal_agent_cases add column if not exists whatsapp_number text not null default '';
alter table public.portal_agent_cases add column if not exists title text not null default '';
alter table public.portal_agent_cases add column if not exists description text not null default '';
alter table public.portal_agent_cases add column if not exists caller_hint text not null default '';
alter table public.portal_calls add column if not exists source text not null default 'runtime';


drop schema serendib_inbound;
