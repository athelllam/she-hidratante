-- SHE Communication contacts. Run once in Supabase SQL Editor.
create table if not exists public.communication_contacts (
  id bigserial primary key,
  name text,
  email text,
  phone text,
  source text not null default 'unknown',
  source_submitted_at timestamptz,
  email_marketing_consent boolean not null default false,
  sms_marketing_consent boolean not null default false,
  consent_status text not null default 'unknown',
  consent_source text,
  consent_recorded_at timestamptz,
  email_unsubscribed_at timestamptz,
  sms_unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists communication_contacts_email_unique
  on public.communication_contacts (lower(email)) where email is not null and email <> '';
create unique index if not exists communication_contacts_phone_unique
  on public.communication_contacts (phone) where phone is not null and phone <> '';

alter table public.communication_contacts enable row level security;
-- Access through the server API using the Supabase service role only.


-- Compatibility for projects where the first version of this migration was already applied.
alter table public.communication_contacts add column if not exists consent_source text;
alter table public.communication_contacts add column if not exists consent_recorded_at timestamptz;
