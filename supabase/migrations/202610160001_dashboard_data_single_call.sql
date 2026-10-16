-- Chargement du dashboard en un seul appel (2026-10-16).
--
-- Avant : le dashboard lisait get_lead_events et get_daily_spend par pages de
-- 1000 lignes (limite max-rows de l'API). Chaque page relancait la fonction
-- entiere : pour Robin Worms, 9 pages x 8 822 evenements, soit environ 13,5 Mo
-- par page a recalculer, dont raw_data_json et form_answers_json que le
-- dashboard n'utilise pas.
-- Apres : une seule fonction renvoie une seule valeur { events, spend }, sans
-- les colonnes inutiles. La limite max-rows ne s'applique pas a une valeur
-- unique. Memes droits et meme controle d'acces que get_lead_events.
--
-- get_lead_events et get_daily_spend sont gardees le temps que la nouvelle
-- version du dashboard soit en ligne.

begin;

create or replace function public.get_dashboard_data(schema_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  events jsonb;
  spend jsonb;
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

  execute format(
    'select coalesce(jsonb_agg(
        to_jsonb(e) - ''raw_data_json'' - ''form_answers_json'' - ''source_id''
                    - ''date_setting'' - ''date_closing'' - ''show_no_show'' - ''created_at''
        order by e.event_at asc nulls last, e.lead_id asc nulls last, e.event_type asc, e.id asc
      ), ''[]''::jsonb)
       from %I.fact_lead_events as e
      where e.event_type in (''lead_created'', ''setting_updated'', ''closing_updated'')',
    $1
  ) into events;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t) - ''created_at'' order by t.spend_date desc, t.id), ''[]''::jsonb)
       from %I.fact_daily_spend as t',
    $1
  ) into spend;

  return jsonb_build_object('events', events, 'spend', spend);
end;
$$;

revoke all on function public.get_dashboard_data(text) from public, anon;
grant execute on function public.get_dashboard_data(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
