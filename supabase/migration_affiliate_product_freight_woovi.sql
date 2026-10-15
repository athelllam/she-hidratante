-- Frete Woovi para a loja de benefícios de afiliadas.
-- Linhas antigas são tratadas como frete já regularizado; novas compras enviam freight_paid=false.
alter table public.affiliate_product_purchases
  add column if not exists freight_amount numeric(10,2) not null default 16,
  add column if not exists freight_paid boolean not null default true,
  add column if not exists freight_payment_url text,
  add column if not exists freight_correlation_id text,
  add column if not exists freight_charge_id text,
  add column if not exists freight_paid_at timestamptz;

create unique index if not exists affiliate_product_purchases_freight_correlation_idx
  on public.affiliate_product_purchases(freight_correlation_id)
  where freight_correlation_id is not null;
