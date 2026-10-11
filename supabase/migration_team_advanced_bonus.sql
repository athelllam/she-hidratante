-- Bônus de Equipe Avançada I/II para She Afiliadas
-- Execute uma única vez no Supabase SQL Editor antes do deploy.
alter table public.affiliate_settings
  add column if not exists team_advanced1_members integer not null default 10,
  add column if not exists team_advanced1_sales integer not null default 20,
  add column if not exists team_advanced1_commission numeric(12,2) not null default 15.00,
  add column if not exists team_advanced2_members integer not null default 20,
  add column if not exists team_advanced2_sales integer not null default 40,
  add column if not exists team_advanced2_commission numeric(12,2) not null default 20.00;
