-- Corrige concessão de impulso pelo painel admin:
-- não consulta nem debita saldo, substitui impulso pendente/ativo e ativa imediatamente no carrossel.
create or replace function public.she_team_boost_admin_grant(
  p_affiliate_id bigint,
  p_connections integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  affiliate_name text;
  plan_price numeric;
  new_boost record;
begin
  if p_connections not in (5, 10) then
    raise exception 'Escolha um impulso de 5 ou 10 conexões.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(984512, p_affiliate_id::integer);

  select name into affiliate_name
  from public.affiliates
  where id = p_affiliate_id
  limit 1;
  if not found then
    raise exception 'Afiliada não encontrada.' using errcode = 'P0002';
  end if;

  if p_connections = 5 then
    select team_boost_small_price into plan_price from public.affiliate_settings where id = 1;
  else
    select team_boost_large_price into plan_price from public.affiliate_settings where id = 1;
  end if;
  plan_price := greatest(coalesce(plan_price, case when p_connections = 5 then 30 else 50 end), 0.01);

  -- Uma concessão administrativa nova passa a valer imediatamente.
  -- Não há qualquer leitura de saldo e admin_granted exclui o valor do cálculo de saldo reservado.
  update public.affiliate_team_boosts
     set status = 'cancelled'
   where affiliate_id = p_affiliate_id and status in ('queued', 'active');

  insert into public.affiliate_team_boosts
    (affiliate_id, price, connections_total, connections_remaining, status, admin_granted, activated_at)
  values
    (p_affiliate_id, plan_price, p_connections, p_connections, 'active', true, now())
  returning * into new_boost;

  return jsonb_build_object(
    'boostId', new_boost.id,
    'status', new_boost.status,
    'price', 0,
    'planPrice', new_boost.price,
    'connections', new_boost.connections_total,
    'adminGranted', true
  );
end;
$$;
