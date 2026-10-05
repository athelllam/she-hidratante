-- Execute uma vez se o banco já estiver em produção e você não quiser rerodar o schema.sql inteiro.
-- A partir desta alteração, cada comissão já creditada fica congelada e alterações
-- no painel administrativo passam a valer somente para novas vendas.

alter table public.affiliate_orders
  add column if not exists commission_locked boolean not null default false;

alter table public.affiliate_orders
  add column if not exists team_commission numeric(12,2) not null default 0;

create index if not exists affiliate_orders_commission_locked_idx
  on public.affiliate_orders(commission_locked);
