-- Securisation multi-clients + creation du client LEARNIM (applique le 2026-10-01).
-- Les rattachements comptes -> clients (master.client_users) sont des donnees,
-- volontairement absents de cette migration.
--
-- Avant : les fonctions de lecture et les tables Robin Worms etaient
-- accessibles avec la cle publique anon (lecture ET ecriture), sans connexion.
-- Apres : chaque compte ne lit que les clients auxquels il est rattache
-- (master.client_users) ; les tables ne sont accessibles qu'a service_role
-- (synchros Make / n8n) ; le dashboard passe par les fonctions ci-dessous.

begin;

-- 1. Modele de creation d'un espace client, aligne sur la structure reelle
--    de Robin Worms (avec cpc, source_id et les tables dim_*), sans aucun
--    droit pour anon/authenticated.
create or replace function public.create_client_schema(schema_name text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  t text;
begin
  execute format('create schema if not exists %I', $1);

  execute format($f$
    create table if not exists %1$I.dim_campaigns (
      id text primary key,
      campaign_name text,
      status text,
      platform text,
      launch_date text,
      created_at timestamptz default now()
    )$f$, $1);

  execute format($f$
    create table if not exists %1$I.dim_adsets (
      id text primary key,
      adset_name text,
      campaign_id text references %1$I.dim_campaigns(id),
      status text,
      created_at timestamptz default now()
    )$f$, $1);

  execute format($f$
    create table if not exists %1$I.dim_ads (
      id text primary key,
      ad_name text,
      ad_url text,
      status text,
      campaign_id text references %1$I.dim_campaigns(id),
      adset_id text references %1$I.dim_adsets(id),
      launch_date text,
      created_at timestamptz default now()
    )$f$, $1);

  execute format($f$
    create table if not exists %1$I.dim_sources (
      id text primary key,
      social_network text,
      platform text,
      created_at timestamptz default now()
    )$f$, $1);

  execute format($f$
    create table if not exists %1$I.fact_lead_events (
      id uuid primary key default gen_random_uuid(),
      lead_id text not null,
      event_type text not null,
      event_at timestamptz,
      campaign_id text,
      adset_id text,
      ad_id text,
      source_id text,
      platform text,
      social_network text,
      campaign_name text,
      adset_name text,
      ad_name text,
      firstname text,
      lastname text,
      email text,
      phone text,
      placement text,
      device text,
      date_setting text,
      date_closing text,
      show_no_show text,
      type_projet text,
      type_achat text,
      age_range text,
      job_situation text,
      salary_range text,
      setting_status text,
      closing_status text,
      form_answers_json text,
      raw_data_json jsonb,
      created_at timestamptz default now(),
      constraint %2$I unique nulls not distinct (lead_id, event_type, setting_status, closing_status)
    )$f$, $1, $1 || '_unique');

  execute format($f$
    create table if not exists %1$I.fact_daily_spend (
      id text primary key default gen_random_uuid()::text,
      spend_date timestamptz,
      campaign_id text references %1$I.dim_campaigns(id),
      campaign_name text,
      platform text,
      clicks integer,
      conversions integer,
      spend numeric,
      cost_per_conversion numeric,
      cost_per_click numeric,
      cpc numeric,
      cpm numeric,
      ctr numeric,
      leads_count integer,
      created_at timestamptz default now()
    )$f$, $1);

  execute format('revoke all on all tables in schema %I from anon, authenticated', $1);
  execute format('revoke usage on schema %I from anon, authenticated', $1);
  execute format('grant usage on schema %I to service_role', $1);
  execute format('grant all on all tables in schema %I to service_role', $1);
  foreach t in array array['dim_campaigns', 'dim_adsets', 'dim_ads', 'dim_sources', 'fact_lead_events', 'fact_daily_spend'] loop
    execute format('alter table %I.%I enable row level security', $1, t);
  end loop;
end;
$$;

-- 2. Lecture des donnees : uniquement les clients rattaches au compte connecte.
--    Plus aucun repli sur Robin Worms pour un compte inconnu ou anonyme.
create or replace function public.get_lead_events(schema_name text)
returns setof jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
      from master.clients c
      join master.client_users cu on cu.client_id = c.id
     where cu.supabase_user_id = auth.uid()
       and c.schema_name = $1
  ) then
    raise exception 'Tenant schema is not authorized' using errcode = '42501';
  end if;

  return query execute format(
    'select to_jsonb(e)
       from %I.fact_lead_events as e
      where e.event_type in (''lead_created'', ''setting_updated'', ''closing_updated'')
      order by e.event_at asc nulls last, e.lead_id asc nulls last, e.event_type asc, e.id asc',
    $1
  );
end;
$$;

create or replace function public.get_daily_spend(schema_name text)
returns setof json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
      from master.clients c
      join master.client_users cu on cu.client_id = c.id
     where cu.supabase_user_id = auth.uid()
       and c.schema_name = $1
  ) then
    raise exception 'Tenant schema is not authorized' using errcode = '42501';
  end if;

  return query execute format(
    'select row_to_json(t) from %I.fact_daily_spend t order by spend_date desc, id',
    $1
  );
end;
$$;

-- Tous les clients du compte (plus de LIMIT 1, pour le selecteur de client),
-- et seulement pour soi-meme : on ne peut plus interroger les clients d'un
-- autre utilisateur.
create or replace function public.get_client_by_user_id(user_uuid uuid)
returns table(schema_name text, name text, slug text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select c.schema_name, c.name, c.slug
    from master.clients c
    join master.client_users cu on cu.client_id = c.id
   where cu.supabase_user_id = user_uuid
     and (user_uuid = auth.uid() or auth.role() = 'service_role')
   order by c.name;
$$;

-- 3. Droits d'execution des fonctions.
revoke all on function public.get_lead_events(text) from public, anon;
revoke all on function public.get_daily_spend(text) from public, anon;
revoke all on function public.get_client_by_user_id(uuid) from public, anon;
grant execute on function public.get_lead_events(text) to authenticated, service_role;
grant execute on function public.get_daily_spend(text) to authenticated, service_role;
grant execute on function public.get_client_by_user_id(uuid) to authenticated, service_role;

revoke all on function public.create_client_schema(text) from public, anon, authenticated;
revoke all on function public.get_test_leads() from public, anon, authenticated;
revoke all on function public.get_leads_without_setting() from public, anon, authenticated;
grant execute on function public.create_client_schema(text) to service_role;
grant execute on function public.get_test_leads() to service_role;
grant execute on function public.get_leads_without_setting() to service_role;

-- 4. LEARNIM : espace vide (comptes rattaches via master.client_users, hors migration).
select public.create_client_schema('client_learnim');

insert into master.clients (slug, name, schema_name)
select 'learnim', 'LEARNIM', 'client_learnim'
 where not exists (select 1 from master.clients where slug = 'learnim');

-- 5. Fermer l'acces direct anon/authenticated aux tables de tous les espaces
--    clients existants (Robin Worms, LEARNIM, et client_test s'il existe).
do $$
declare
  s text;
begin
  for s in
    select c.schema_name from master.clients c
    union
    select n.nspname from pg_namespace n where n.nspname = 'client_test'
  loop
    execute format('revoke all on all tables in schema %I from anon, authenticated', s);
    execute format('revoke usage on schema %I from anon, authenticated', s);
    execute format('grant usage on schema %I to service_role', s);
    execute format('grant all on all tables in schema %I to service_role', s);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
