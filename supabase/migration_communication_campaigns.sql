-- SHE Communication campaigns and send history. Run once in Supabase SQL Editor.
create table if not exists public.communication_campaigns (
  id bigserial primary key,
  channel text not null check (channel in ('email','sms')),
  title text not null,
  subject text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_send_logs (
  id bigserial primary key,
  campaign_id bigint references public.communication_campaigns(id) on delete set null,
  channel text not null check (channel in ('email','sms')),
  title text not null,
  subject text,
  content text not null,
  recipient_count integer not null default 0,
  provider text,
  sent_at timestamptz not null default now()
);

alter table public.communication_campaigns enable row level security;
alter table public.communication_send_logs enable row level security;
-- Access only through the server API using the Supabase service role.
