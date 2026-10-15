-- Concessão administrativa gratuita de Impulso de Equipe
-- Execute uma única vez no Supabase SQL Editor do projeto She Afiliadas.

alter table public.affiliate_team_boosts
  add column if not exists admin_granted boolean not null default false;

-- Impulsos concedidos pelo administrador não podem reservar/descontar saldo.
create or replace function public.she_team_boost_purchase(
  p_affiliate_id bigint,
  p_price numeric,
  p_connections integer,
  p_earned_balance numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing record;
  reserved_amount numeric;
  personal_withdrawals numeric;
  available numeric;
  new_boost record;
begin
  perform pg_advisory_xact_lock(984512, p_affiliate_id::integer);

  select * into existing
  from affiliate_team_boosts
  where affiliate_id = p_affiliate_id and status in ('queued','active')
  limit 1;
  if found then
    raise exception 'Você já possui um impulso na fila ou ativo.' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount),0) into personal_withdrawals
  from affiliate_withdrawals
  where affiliate_id = p_affiliate_id and source = 'personal' and status in ('pending','approved','paid');

  select coalesce(sum(price),0) into reserved_amount
  from affiliate_team_boosts
  where affiliate_id = p_affiliate_id
    and status in ('queued','active','completed')
    and admin_granted = false;

  available := coalesce(p_earned_balance,0) - personal_withdrawals - reserved_amount;
  if available + 0.001 < p_price then
    raise exception 'Saldo disponível insuficiente para este impulso. Saldo: R$ %', round(available,2) using errcode = 'P0002';
  end if;

  insert into affiliate_team_boosts (affiliate_id, price, connections_total, connections_remaining, status, admin_granted)
  values (p_affiliate_id, p_price, p_connections, p_connections, 'queued', false)
  returning * into new_boost;

  perform she_team_boost_activate_waiting();

  select * into new_boost from affiliate_team_boosts where id = new_boost.id;
  return jsonb_build_object('boostId', new_boost.id, 'status', new_boost.status, 'price', new_boost.price, 'connections', new_boost.connections_total, 'adminGranted', new_boost.admin_granted);
end;
$$;

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
  existing record;
  plan_price numeric;
  new_boost record;
begin
  if p_connections not in (5, 10) then
    raise exception 'Escolha um impulso de 5 ou 10 conexões.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(984512, p_affiliate_id::integer);

  select id, name into existing
  from affiliates
  where id = p_affiliate_id
  limit 1;
  if not found then
    raise exception 'Afiliada não encontrada.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from affiliate_team_boosts
    where affiliate_id = p_affiliate_id and status in ('queued','active')
  ) then
    raise exception 'Esta afiliada já possui um impulso na fila ou ativo.' using errcode = 'P0001';
  end if;

  if p_connections = 5 then
    select team_boost_small_price into plan_price from affiliate_settings where id = 1;
  else
    select team_boost_large_price into plan_price from affiliate_settings where id = 1;
  end if;
  plan_price := greatest(coalesce(plan_price, case when p_connections = 5 then 30 else 50 end), 0.01);

  insert into affiliate_team_boosts
    (affiliate_id, price, connections_total, connections_remaining, status, admin_granted)
  values
    (p_affiliate_id, 0, p_connections, p_connections, 'queued', true)
  returning * into new_boost;

  perform she_team_boost_activate_waiting();

  select * into new_boost from affiliate_team_boosts where id = new_boost.id;
  return jsonb_build_object(
    'boostId', new_boost.id,
    'status', new_boost.status,
    'price', 0,
    'planPrice', plan_price,
    'connections', new_boost.connections_total,
    'adminGranted', true
  );
end;
$$;

create or replace function public.she_team_boost_admin_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
  queue_count integer;
  delivered integer;
  active_rows jsonb;
begin
  select count(*) into active_count from affiliate_team_boosts where status='active';
  select count(*) into queue_count from affiliate_team_boosts where status='queued';
  select count(*) into delivered from affiliate_team_boosts where status='completed';
  select coalesce(jsonb_agg(x order by x.activated_at asc), '[]'::jsonb) into active_rows
  from (
    select b.id,b.affiliate_id,a.name,a.whatsapp,b.price,b.admin_granted,b.connections_total,b.connections_remaining,b.status,b.queue_created_at,b.activated_at
    from affiliate_team_boosts b join affiliates a on a.id=b.affiliate_id
    where b.status='active'
    order by b.activated_at asc
  ) x;
  return jsonb_build_object('activeCount',active_count,'queueCount',queue_count,'completedCount',delivered,'active',active_rows);
end;
$$;
