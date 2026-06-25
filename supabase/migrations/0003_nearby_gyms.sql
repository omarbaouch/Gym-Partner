-- Phase 2 — recherche de salles par proximité (earthdistance).
-- Fonction NON security definer : la RLS sur `gyms` (lecture authentifiée) s'applique.

create or replace function public.nearby_gyms(
  _lat double precision,
  _lng double precision,
  _radius_m double precision default 5000,
  _chain uuid default null
)
returns table (
  id          uuid,
  name        text,
  city        text,
  address     text,
  chain_id    uuid,
  chain_name  text,
  latitude    double precision,
  longitude   double precision,
  distance_m  double precision
)
language sql
stable
as $$
  select
    g.id,
    g.name,
    g.city,
    g.address,
    g.chain_id,
    c.name as chain_name,
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
  order by distance_m
  limit 50;
$$;
