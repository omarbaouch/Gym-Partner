-- Authentification Google + recherche par ville.

-- ---------------------------------------------------------------------------
-- 1. Autocomplétion des villes : suggestions à partir des salles connues.
--    Recherche par préfixe insensible aux accents/casse/ponctuation
--    (réutilise norm_gym_name, migration 0012). Renvoie le centroïde des
--    salles de la ville : la sélection déclenche une recherche de proximité
--    autour de ce point (mêmes résultats dédupliqués, triés par distance).
--    Groupé par département pour séparer les homonymes (Saint-Denis 93 / 974).
-- ---------------------------------------------------------------------------
create or replace function public.search_cities(_q text)
returns table (
  city      text,
  dept      text,
  gym_count bigint,
  latitude  double precision,
  longitude double precision
)
language sql
stable
as $$
  select
    g.city,
    left(g.postal_code, 2) as dept,
    count(*)               as gym_count,
    avg(g.latitude)        as latitude,
    avg(g.longitude)       as longitude
  from public.gyms g
  where g.city is not null
    and g.latitude is not null
    and g.longitude is not null
    and public.norm_gym_name(g.city) like public.norm_gym_name(_q) || '%'
  group by g.city, left(g.postal_code, 2)
  order by count(*) desc, g.city
  limit 8;
$$;

-- ---------------------------------------------------------------------------
-- 2. Connexion Google : les métadonnées OAuth exposent `full_name`/`name`,
--    pas `display_name`. On les prend en compte à la création du profil.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
