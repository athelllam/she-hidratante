-- SHE dynamic products and per-page cart configuration
-- Run this migration in Supabase SQL Editor before deploying the application.
create extension if not exists pgcrypto;

create table if not exists public.she_cart_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  yampi_token text not null unique check (char_length(yampi_token) between 5 and 50),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.she_cart_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.she_cart_page_products (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.she_cart_pages(id) on delete cascade,
  product_id uuid not null references public.she_cart_products(id) on delete cascade,
  role text not null check (role in ('main', 'upsell')),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (page_id, product_id, role)
);

create index if not exists she_cart_page_products_page_idx on public.she_cart_page_products(page_id, active, position);
create index if not exists she_cart_page_products_product_idx on public.she_cart_page_products(product_id);

-- Server uses the Supabase service role. Browser access is intentionally disabled.
alter table public.she_cart_products enable row level security;
alter table public.she_cart_pages enable row level security;
alter table public.she_cart_page_products enable row level security;
revoke all on public.she_cart_products from anon, authenticated;
revoke all on public.she_cart_pages from anon, authenticated;
revoke all on public.she_cart_page_products from anon, authenticated;

-- Create a public image bucket. Uploads themselves are performed server-side after admin authentication.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('she-product-images', 'she-product-images', true, 4194304, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 4194304, allowed_mime_types = array['image/webp'];

-- Seed current product catalog by the existing checkout tokens. Re-running is safe.
insert into public.she_cart_products (name, description, yampi_token, active) values
('Hidratante', 'Hidrata profundamente a região íntima', 'EFH0YOIDTO', true),
('Blister', 'Faça seus próprios ovinhos em casa', '7B6B7IL4ZM', true),
('Stick', 'Uniformiza o tom, reduz manchas, hidrata e protege', 'GVVB8UXHJ8', true),
('Hidratante +1', 'Hidratante íntimo adicional', '6G99ZYJTDE', true),
('Stick +1', 'Stick clareador adicional', 'IWK5ZWCEUO', true),
('Pocket Size', 'Leve para qualquer lugar e fique hidratada sempre', 'ORM1LRMTT5', true)
on conflict (yampi_token) do update set name = excluded.name, description = excluded.description, updated_at = now();

insert into public.she_cart_pages (name, slug) values ('Hidratante', 'hidratante'), ('Stick', 'stick')
on conflict (slug) do update set name = excluded.name, updated_at = now();

-- Replace only mappings for these two known pages, keeping any future page configurations intact.
with page_ids as (select id, slug from public.she_cart_pages where slug in ('hidratante','stick')),
product_ids as (select id, yampi_token from public.she_cart_products)
delete from public.she_cart_page_products m using page_ids p where m.page_id = p.id;

insert into public.she_cart_page_products (page_id, product_id, role, position)
select p.id, pr.id, v.role, v.position
from (values
 ('hidratante','EFH0YOIDTO','main',0),
 ('hidratante','7B6B7IL4ZM','main',1),
 ('hidratante','6G99ZYJTDE','upsell',0),
 ('hidratante','GVVB8UXHJ8','upsell',1),
 ('hidratante','ORM1LRMTT5','upsell',2),
 ('stick','GVVB8UXHJ8','main',0),
 ('stick','6G99ZYJTDE','upsell',0),
 ('stick','IWK5ZWCEUO','upsell',1),
 ('stick','7B6B7IL4ZM','upsell',2),
 ('stick','ORM1LRMTT5','upsell',3)
) as v(slug, token, role, position)
join public.she_cart_pages p on p.slug = v.slug
join public.she_cart_products pr on pr.yampi_token = v.token;
