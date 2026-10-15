-- Link de rastreio e campos de endereço estruturados para exportação CSV de etiquetas.
alter table public.affiliate_product_purchases
  add column if not exists tracking_url text,
  add column if not exists street text not null default '',
  add column if not exists house_number text not null default '',
  add column if not exists complement text not null default '',
  add column if not exists neighborhood text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '';
