-- Google Places devient la source de vérité du référentiel des salles.
-- Les données OSM/manuelles se sont révélées peu fiables (noms, positions).
--
-- 1. gym_source_rank()      — hiérarchie des sources : Google > OSM > manuel
-- 2. gyms_merge_duplicate   — une salle Google ÉCRASE le doublon OSM/manuel
--                             (nom, adresse, coordonnées) au lieu de le compléter
-- 3. nearby_gyms            — à doublon égal, préfère la ligne Google
-- 4. purge_non_google_gyms  — supprime les salles non-Google sans utilisateur
--                             (à appeler après un import Google complet)

-- ---------------------------------------------------------------------------
-- 1. Rang de fiabilité d'une source (via le format du place_id)
-- ---------------------------------------------------------------------------
create or replace function public.gym_source_rank(_place_id text)
returns int
language sql
immutable
parallel safe
as $$
  select case
    when _place_id is null then 0            -- seed manuel
    when _place_id like 'osm:%' then 1       -- OpenStreetMap
    else 2                                    -- Google Places
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Fusion à l'insertion, avec priorité de source :
--    - source entrante plus fiable  → écrase nom/adresse/coordonnées/place_id ;
--    - source égale ou moins fiable → complète les champs manquants (comme avant).
-- ---------------------------------------------------------------------------
create or replace function public.gyms_merge_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _existing public.gyms%rowtype;
begin
  -- Rattache la salle à son enseigne dès l'insertion (quel que soit le
  -- chemin d'import) : logo garanti et détection de doublon par enseigne.
  if new.chain_id is null then
    select c.id into new.chain_id
    from public.gym_chain_aliases a
    join public.gym_chains c on c.name = a.chain_name
    where position(a.alias in public.norm_gym_name(new.name)) > 0
    order by length(a.alias) desc
    limit 1;
  end if;

  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  select g.* into _existing
  from public.gyms g
  where g.latitude is not null and g.longitude is not null
    and earth_box(ll_to_earth(new.latitude, new.longitude), 120)
        @> ll_to_earth(g.latitude, g.longitude)
    and earth_distance(ll_to_earth(new.latitude, new.longitude),
                       ll_to_earth(g.latitude, g.longitude)) < 120
    and (public.norm_gym_name(g.name) = public.norm_gym_name(new.name)
         or (g.chain_id is not null and g.chain_id = new.chain_id))
  order by earth_distance(ll_to_earth(new.latitude, new.longitude),
                          ll_to_earth(g.latitude, g.longitude))
  limit 1;

  if _existing.id is null then
    return new;
  end if;

  if public.gym_source_rank(new.place_id) > public.gym_source_rank(_existing.place_id) then
    -- La nouvelle source fait autorité : on remplace les données du doublon
    -- (l'id et les références utilisateurs sont conservés).
    update public.gyms
    set place_id    = new.place_id,
        name        = new.name,
        address     = coalesce(nullif(new.address, ''), nullif(address, '')),
        postal_code = coalesce(new.postal_code, postal_code),
        city        = coalesce(new.city, city),
        chain_id    = coalesce(new.chain_id, chain_id),
        latitude    = new.latitude,
        longitude   = new.longitude
    where id = _existing.id;
  else
    -- Source équivalente ou moins fiable : simple enrichissement.
    update public.gyms
    set place_id    = coalesce(place_id, new.place_id),
        address     = coalesce(nullif(address, ''), nullif(new.address, '')),
        postal_code = coalesce(postal_code, new.postal_code),
        city        = coalesce(city, new.city),
        chain_id    = coalesce(chain_id, new.chain_id)
    where id = _existing.id;
  end if;

  return null; -- annule l'insertion : la salle existante porte les données
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. nearby_gyms : à identité égale, préférer la ligne Google.
-- ---------------------------------------------------------------------------
drop function if exists public.nearby_gyms(double precision, double precision, double precision, uuid);

create or replace function public.nearby_gyms(
  _lat double precision,
  _lng double precision,
  _radius_m double precision default 8000,
  _chain uuid default null
)
returns table (
  id             uuid,
  name           text,
  city           text,
  address        text,
  postal_code    text,
  chain_id       uuid,
  chain_name     text,
  chain_logo_url text,
  brand_color    text,
  latitude       double precision,
  longitude      double precision,
  distance_m     double precision
)
language sql
stable
as $$
  select *
  from (
    select distinct on (
      public.norm_gym_name(g.name),
      g.chain_id,
      round(g.latitude::numeric, 3),
      round(g.longitude::numeric, 3)
    )
      g.id,
      g.name,
      g.city,
      g.address,
      g.postal_code,
      g.chain_id,
      c.name        as chain_name,
      c.logo_url    as chain_logo_url,
      c.brand_color as brand_color,
      g.latitude,
      g.longitude,
      earth_distance(
        ll_to_earth(_lat, _lng),
        ll_to_earth(g.latitude, g.longitude)
      ) as distance_m
    from public.gyms g
    left join public.gym_chains c on c.id = g.chain_id
    where g.latitude is not null
      and g.longitude is not null
      and (_chain is null or g.chain_id = _chain)
      and earth_box(ll_to_earth(_lat, _lng), _radius_m)
          @> ll_to_earth(g.latitude, g.longitude)
      and earth_distance(
            ll_to_earth(_lat, _lng),
            ll_to_earth(g.latitude, g.longitude)
          ) <= _radius_m
    order by
      public.norm_gym_name(g.name),
      g.chain_id,
      round(g.latitude::numeric, 3),
      round(g.longitude::numeric, 3),
      public.gym_source_rank(g.place_id) desc,
      (nullif(g.address, '') is not null) desc
  ) dedup
  order by distance_m
  limit 50;
$$;

-- ---------------------------------------------------------------------------
-- 4. Purge des salles non-Google (OSM / seeds manuels) sans aucun utilisateur.
--    À appeler APRÈS un import Google complet : les salles OSM correspondant à
--    une vraie salle Google ont déjà été écrasées (rang 2, conservées) ; ce qui
--    reste en rang < 2 est du bruit. Réservée au service_role.
-- ---------------------------------------------------------------------------
create or replace function public.purge_non_google_gyms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _deleted int;
begin
  delete from public.gyms g
  where public.gym_source_rank(g.place_id) < 2
    and not exists (select 1 from public.user_gyms ug where ug.gym_id = g.id)
    and not exists (select 1 from public.checkins ck where ck.gym_id = g.id);
  get diagnostics _deleted = row_count;
  return _deleted;
end;
$$;

revoke execute on function public.purge_non_google_gyms() from public;
revoke execute on function public.purge_non_google_gyms() from anon;
revoke execute on function public.purge_non_google_gyms() from authenticated;
