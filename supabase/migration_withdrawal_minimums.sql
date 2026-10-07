-- Mínimos de saque separados por origem. Mantém o incremento fixo de R$100.
alter table public.affiliate_settings
  add column if not exists personal_withdrawal_min numeric(12,2) not null default 100.00,
  add column if not exists team_withdrawal_min numeric(12,2) not null default 100.00;

update public.affiliate_settings
set personal_withdrawal_min = coalesce(personal_withdrawal_min, 100.00),
    team_withdrawal_min = coalesce(team_withdrawal_min, 100.00)
where id = 1;
