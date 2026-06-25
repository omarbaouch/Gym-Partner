-- Durcissement sécurité (suite aux advisors Supabase).

-- 1) search_path explicite sur les fonctions qui en manquaient.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.nearby_gyms(
  _lat double precision,
  _lng double precision,
  _radius_m double precision default 5000,
  _chain uuid default null
)
returns table (
  id uuid, name text, city text, address text, chain_id uuid, chain_name text,
  latitude double precision, longitude double precision, distance_m double precision
)
language sql
stable
set search_path = public
as $$
  select g.id, g.name, g.city, g.address, g.chain_id, c.name as chain_name,
    g.latitude, g.longitude,
    earth_distance(ll_to_earth(_lat, _lng), ll_to_earth(g.latitude, g.longitude)) as distance_m
  from public.gyms g
  left join public.gym_chains c on c.id = g.chain_id
  where g.latitude is not null and g.longitude is not null
    and (_chain is null or g.chain_id = _chain)
    and earth_box(ll_to_earth(_lat, _lng), _radius_m) @> ll_to_earth(g.latitude, g.longitude)
    and earth_distance(ll_to_earth(_lat, _lng), ll_to_earth(g.latitude, g.longitude)) <= _radius_m
  order by distance_m
  limit 50;
$$;

-- 2) Bucket avatars public : la lecture des URLs ne nécessite pas de policy SELECT.
--    On retire la policy qui autorisait le LISTING de tous les fichiers.
drop policy if exists "avatars public read" on storage.objects;

-- 3) Restreindre l'exécution des fonctions.
--    Fonctions de trigger : aucun appel direct.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;

--    Helpers + RPC : réservés aux utilisateurs authentifiés (la RLS les appelle
--    dans le contexte du rôle authenticated).
revoke execute on function public.shares_gym(uuid) from public, anon;
revoke execute on function public.is_blocked_with(uuid) from public, anon;
revoke execute on function public.is_conversation_member(uuid) from public, anon;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
revoke execute on function public.my_conversations() from public, anon;
revoke execute on function public.nearby_gyms(double precision, double precision, double precision, uuid)
  from public, anon;

grant execute on function public.shares_gym(uuid) to authenticated;
grant execute on function public.is_blocked_with(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.nearby_gyms(double precision, double precision, double precision, uuid)
  to authenticated;
