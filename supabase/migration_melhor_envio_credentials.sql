-- Armazenamento server-side de tokens OAuth do Melhor Envio.
-- A API usa SUPABASE_SERVICE_ROLE_KEY; não habilitar acesso público.
create table if not exists public.melhor_envio_credentials (
  id integer primary key check (id = 1),
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  token_type text not null default 'Bearer',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.melhor_envio_credentials enable row level security;
revoke all on public.melhor_envio_credentials from anon, authenticated;
