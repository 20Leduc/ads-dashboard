-- Reuse the canonical tenant lookup already used by the application.
-- This avoids coupling get_lead_events to the physical location of clients.
create or replace function public.get_lead_events(schema_name text)
returns setof jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  authorized_schema text;
begin
  select coalesce(
           to_jsonb(client_row)->>'schema_name',
           to_jsonb(client_row)->'get_client_by_user_id'->>'schema_name'
         )
    into authorized_schema
    from public.get_client_by_user_id(auth.uid()) as client_row
   limit 1;

  if authorized_schema is null or authorized_schema <> $1 then
    raise exception 'Tenant schema is not authorized'
      using errcode = '42501';
  end if;

  return query execute format(
    'select to_jsonb(e)
       from %I.fact_lead_events as e
      where e.event_type in (''lead_created'', ''setting_updated'', ''closing_updated'')
      order by e.event_at asc nulls last,
               e.lead_id asc nulls last,
               e.event_type asc,
               e.id asc nulls last,
               to_jsonb(e)::text asc',
    authorized_schema
  );
end;
$$;

revoke all on function public.get_lead_events(text) from public;
revoke all on function public.get_lead_events(text) from anon;
grant execute on function public.get_lead_events(text) to authenticated;

comment on function public.get_lead_events(text) is
  'Returns the event stream authorized by the canonical get_client_by_user_id lookup.';

notify pgrst, 'reload schema';
