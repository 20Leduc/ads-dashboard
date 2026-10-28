-- Liens d'invitation par client, liés à un email (2026-10-28).
--
-- L'administrateur crée une invitation (client + email) et envoie le lien
-- /invite/<code>. À la connexion, claim_client_invites() rattache le compte à
-- tous les clients pour lesquels une invitation valide existe pour SON email
-- (prouvé par le lien magique). Le lien seul ne donne aucun accès.
--
-- Créer une invitation (SQL Editor) :
--   select public.create_client_invite('learnim', 'adresse@exemple.fr');
--   → renvoie le code ; le lien est https://<domaine du dashboard>/invite/<code>
-- Désactiver une invitation :
--   update master.client_invites set revoked_at = now() where code = '<code>';

begin;

create table if not exists master.client_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  client_slug text not null,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz
);

alter table master.client_invites enable row level security;
revoke all on master.client_invites from public, anon, authenticated;

-- 1. Création (administrateur uniquement : SQL Editor ou service_role)
create or replace function public.create_client_invite(p_client_slug text, p_email text, p_days integer default 14)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if not exists (select 1 from master.clients where slug = p_client_slug) then
    raise exception 'Client inconnu : %', p_client_slug;
  end if;
  if p_email is null or trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email invalide : %', p_email;
  end if;
  insert into master.client_invites (code, client_slug, email, expires_at)
  values (v_code, p_client_slug, lower(trim(p_email)), now() + make_interval(days => greatest(p_days, 1)));
  return v_code;
end;
$$;

-- 2. Description publique d'une invitation (page /invite, avant connexion)
create or replace function public.get_client_invite(p_code text)
returns table (client_name text, email_hint text, status text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.name,
         left(i.email, 1) || '***@' || split_part(i.email, '@', 2),
         case
           when i.revoked_at is not null then 'revoked'
           when i.accepted_at is not null then 'accepted'
           when i.expires_at < now() then 'expired'
           else 'valid'
         end
    from master.client_invites i
    join master.clients c on c.slug = i.client_slug
   where i.code = p_code;
$$;

-- 3. Rattachement à la connexion : invitations valides pour l'email du compte
create or replace function public.claim_client_invites()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text;
  v_count integer := 0;
  r record;
begin
  if auth.uid() is null then
    return 0;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return 0;
  end if;

  for r in
    select i.id, c.id as client_id
      from master.client_invites i
      join master.clients c on c.slug = i.client_slug
     where i.email = v_email
       and i.revoked_at is null
       and i.accepted_at is null
       and i.expires_at >= now()
       for update of i
  loop
    insert into master.client_users (client_id, supabase_user_id)
    select r.client_id, auth.uid()
     where not exists (
       select 1 from master.client_users cu
        where cu.client_id = r.client_id and cu.supabase_user_id = auth.uid()
     );
    update master.client_invites set accepted_at = now(), accepted_by = auth.uid() where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.create_client_invite(text, text, integer) from public, anon, authenticated;
revoke all on function public.get_client_invite(text) from public;
revoke all on function public.claim_client_invites() from public, anon;
grant execute on function public.create_client_invite(text, text, integer) to service_role;
grant execute on function public.get_client_invite(text) to anon, authenticated, service_role;
grant execute on function public.claim_client_invites() to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
