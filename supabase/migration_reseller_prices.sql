-- Execute no Supabase SQL Editor.
alter table public.affiliate_settings
  add column if not exists reseller_hydrant_price numeric(12,2) not null default 0,
  add column if not exists reseller_hydrant_blister_price numeric(12,2) not null default 0,
  add column if not exists reseller_stick_price numeric(12,2) not null default 0,
  add column if not exists reseller_complete_price numeric(12,2) not null default 0;
