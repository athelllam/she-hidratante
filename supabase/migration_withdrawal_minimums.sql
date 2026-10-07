-- Mínimos de saque separados por origem. Mantém o incremento fixo de R$100.
alter table public.affiliate_settings
  add column if not exists personal_withdrawal_min numeric(12,2) not null default 100.00,
  add column if not exists team_withdrawal_min numeric(12,2) not null default 100.00;

update public.affiliate_settings
set personal_withdrawal_min = coalesce(personal_withdrawal_min, 100.00),
    team_withdrawal_min = coalesce(team_withdrawal_min, 100.00)
where id = 1;

-- Escrita atômica dos dois mínimos. O backend usa esta RPC para garantir que
-- a atualização somente seja considerada concluída quando o banco confirmar.
create or replace function public.she_update_withdrawal_minimums(
  p_personal numeric,
  p_team numeric
)
returns table (
  personal_withdrawal_min numeric,
  team_withdrawal_min numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_personal is null or p_personal <= 0 or p_team is null or p_team <= 0 then
    raise exception 'Os mínimos de saque devem ser maiores que zero.';
  end if;

  update public.affiliate_settings
  set personal_withdrawal_min = round(p_personal, 2),
      team_withdrawal_min = round(p_team, 2),
      updated_at = now()
  where id = 1;

  if not found then
    raise exception 'Configuração de afiliadas não encontrada.';
  end if;

  return query
    select s.personal_withdrawal_min, s.team_withdrawal_min
    from public.affiliate_settings s
    where s.id = 1;
end;
$$;

revoke all on function public.she_update_withdrawal_minimums(numeric, numeric) from public;
grant execute on function public.she_update_withdrawal_minimums(numeric, numeric) to service_role;
