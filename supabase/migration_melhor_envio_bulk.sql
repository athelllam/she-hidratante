-- Campos para armazenar cotações e dados de etiqueta do Melhor Envio.
alter table public.affiliate_product_purchases
  add column if not exists melhor_envio_quote jsonb,
  add column if not exists melhor_envio_shipment_id text,
  add column if not exists melhor_envio_tracking_code text,
  add column if not exists melhor_envio_label_url text;
