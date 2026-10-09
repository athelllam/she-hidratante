-- Configurações privadas de acesso do administrador e e-mails de notificação.
-- A senha é armazenada apenas como hash SHA-256; nunca é retornada à interface.
create table if not exists public.admin_profile_settings (
  id integer primary key check (id = 1),
  login_username text not null,
  login_email text not null,
  password_sha256 text not null,
  notification_emails text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.admin_profile_settings enable row level security;
revoke all on table public.admin_profile_settings from anon, authenticated;
grant all on table public.admin_profile_settings to service_role;
