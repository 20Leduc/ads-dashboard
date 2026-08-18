-- Correct the tenant lookup for projects where the clients registry lives in master.
-- This follows migration 202608140001 without dropping the deployed RPC.
create or replace function public.get_lead_events(schema_name text)
returns setof jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  authorized_schema text;
begin
  select c.schema_name
    into authorized_schema
    from master.clients as c
   where c.supabase_user_id = auth.uid()
     and c.schema_name = $1
   limit 1;

  if authorized_schema is null then
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
  'Returns the authenticated tenant event stream using the master.clients registry.';

notify pgrst, 'reload schema';
