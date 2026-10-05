-- Execute depois do schema.sql.
-- Adiciona os campos necessários para congelar a comissão no nível atual
-- sem impedir a retroatividade quando a afiliada sobe de nível.
alter table public.affiliate_orders
  add column if not exists commission_level_snapshot text,
  add column if not exists commission_base_snapshot numeric(12,2),
  add column if not exists team_commission_snapshot numeric(12,2);

create index if not exists affiliate_orders_commission_level_idx
  on public.affiliate_orders(affiliate_id, commission_level_snapshot);
