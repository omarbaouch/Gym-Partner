-- Robustesse du référentiel des salles.
--
-- Problèmes corrigés :
--   1. Doublons dans la recherche à proximité (imports OSM + Google Places +
--      seeds insérés sans clé de déduplication commune).
--   2. Logos manquants : salles non rattachées à leur enseigne (« KeepCool »,
--      « Basic Fit », variantes de casse/accents) et logo_url jamais renseigné
--      dans gym_chains.
--   3. Aucun garde-fou : chaque nouvel import pouvait recréer des doublons.
--
-- Défense en profondeur :
--   a. norm_gym_name()          — normalisation commune (accents, casse, ponctuation)
--   b. gym_chains enrichies     — logo_url + brand_color pour toutes les enseignes
--   c. gym_chain_aliases        — rattachement des salles orphelines à leur enseigne
--   d. déduplication one-shot   — fusion des doublons existants (références re-pointées)
--   e. trigger anti-doublon     — un insert proche d'une salle identique fusionne au lieu de dupliquer
--   f. nearby_gyms v2           — dédoublonnage à la lecture + logo/couleur d'enseigne

-- ---------------------------------------------------------------------------
-- a. Normalisation de nom (immutable : indexable et utilisable en trigger)
-- ---------------------------------------------------------------------------
-- L'index unique PARTIEL de la migration 0007 ne supporte pas
-- `on conflict (place_id)` : l'upsert des scripts d'import échouait, chaque
-- ré-import créait donc des doublons. On le remplace par une vraie contrainte
-- unique (les NULL restent distincts, les salles sans place_id sont permises).
drop index if exists public.gyms_place_id_key;
alter table public.gyms drop constraint if exists gyms_place_id_key;
alter table public.gyms add constraint gyms_place_id_key unique (place_id);

create or replace function public.norm_gym_name(_name text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    lower(translate(coalesce(_name, ''),
      'àâäáãåéèêëíìîïóòôöõúùûüçñ',
      'aaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]', '', 'g');
$$;

create index if not exists gyms_norm_name_idx
  on public.gyms (public.norm_gym_name(name));

-- ---------------------------------------------------------------------------
-- b. Enseignes : logos officiels (service favicon Google, cf. chainLogo.ts)
--    + enseignes nationales manquantes.
-- ---------------------------------------------------------------------------
with brands(name, brand_color, domain) as (values
  ('Basic-Fit',          '#FF7A00', 'basic-fit.com'),
  ('Fitness Park',       '#111111', 'fitnesspark.fr'),
  ('On Air',             '#E2001A', 'onair-fitness.fr'),
  ('Keep Cool',          '#00B0B9', 'keepcool.fr'),
  ('L''Orange Bleue',    '#FF6A13', 'lorangebleue.fr'),
  ('Neoness',            '#E6007E', 'neoness.fr'),
  ('Vita Liberté',       '#7AC143', 'vitaliberte.fr'),
  ('One Fitness Club',   '#E4002B', 'onefitnessclub.fr'),
  ('Magic Form',         '#FFD500', 'magicform.fr'),
  ('Anytime Fitness',    '#6F2C91', 'anytimefitness.fr'),
  ('Gigafit',            '#E30613', 'gigafit.fr'),
  ('CMG Sports Club',    '#1A1A1A', 'cmgsportsclub.com'),
  ('Wellness Sport Club','#94C11F', 'wellness-sportclub.fr'),
  ('Liberty Gym',        '#F39200', 'liberty-gym.com')
)
insert into public.gym_chains (name, brand_color, logo_url)
select
  b.name,
  b.brand_color,
  'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON'
    || '&fallback_opts=TYPE,SIZE,URL&size=128&url=https://' || b.domain
from brands b
on conflict (name) do update set
  logo_url    = excluded.logo_url,
  brand_color = coalesce(public.gym_chains.brand_color, excluded.brand_color);

-- ---------------------------------------------------------------------------
-- c. Alias d'enseignes (formes normalisées) pour rattacher les salles
--    orphelines quel que soit le libellé importé (« KeepCool », « Basic Fit
--    Strasbourg », ...). Réutilisé par les scripts d'import.
-- ---------------------------------------------------------------------------
create table if not exists public.gym_chain_aliases (
  alias      text primary key, -- forme norm_gym_name(), matché par inclusion
  chain_name text not null references public.gym_chains (name) on delete cascade
);

alter table public.gym_chain_aliases enable row level security;
create policy "chain aliases readable" on public.gym_chain_aliases
  for select to authenticated using (true);

insert into public.gym_chain_aliases (alias, chain_name) values
  ('basicfit',          'Basic-Fit'),
  ('fitnesspark',       'Fitness Park'),
  ('onair',             'On Air'),
  ('keepcool',          'Keep Cool'),
  ('orangebleue',       'L''Orange Bleue'),
  ('neoness',           'Neoness'),
  ('vitaliberte',       'Vita Liberté'),
  ('onefitness',        'One Fitness Club'),
  ('magicform',         'Magic Form'),
  ('anytimefitness',    'Anytime Fitness'),
  ('gigafit',           'Gigafit'),
  ('cmgsportsclub',     'CMG Sports Club'),
  ('wellnesssportclub', 'Wellness Sport Club'),
  ('libertygym',        'Liberty Gym')
on conflict (alias) do nothing;

-- Rattache les salles orphelines dont le nom contient un alias d'enseigne.
update public.gyms g
set chain_id = c.id
from public.gym_chain_aliases a
join public.gym_chains c on c.name = a.chain_name
where g.chain_id is null
  and position(a.alias in public.norm_gym_name(g.name)) > 0;

-- ---------------------------------------------------------------------------
-- d. Déduplication one-shot des salles existantes.
--    Doublon = même nom normalisé OU même enseigne, à moins de 150 m.
--    On conserve la salle la mieux renseignée (place_id > adresse > ancienneté)
--    et on re-pointe user_gyms / checkins avant suppression.
-- ---------------------------------------------------------------------------
do $$
declare
  _deleted int;
begin
  create temp table gym_dupes on commit drop as
  with ranked as (
    select
      g.id,
      public.norm_gym_name(g.name) as nn,
      g.chain_id, g.latitude, g.longitude,
      row_number() over (
        order by (g.place_id is not null) desc,
                 (nullif(g.address, '') is not null) desc,
                 g.created_at, g.id
      ) as rk
    from public.gyms g
    where g.latitude is not null and g.longitude is not null
  ),
  pairs as (
    select
      d.id as dupe_id,
      k.id as keep_id,
      row_number() over (partition by d.id order by k.rk) as pref
    from ranked d
    join ranked k
      on k.rk < d.rk
     and earth_box(ll_to_earth(d.latitude, d.longitude), 150)
         @> ll_to_earth(k.latitude, k.longitude)
     and earth_distance(ll_to_earth(d.latitude, d.longitude),
                        ll_to_earth(k.latitude, k.longitude)) < 150
     and (k.nn = d.nn or (k.chain_id is not null and k.chain_id = d.chain_id))
  )
  select dupe_id, keep_id from pairs where pref = 1;

  -- Aplatir les chaînes de fusion (a -> b -> c devient a -> c). Termine
  -- toujours : keep_id a un rang strictement inférieur à dupe_id.
  loop
    update gym_dupes m
    set keep_id = m2.keep_id
    from gym_dupes m2
    where m.keep_id = m2.dupe_id;
    exit when not found;
  end loop;

  -- Sauvegarde des champs des doublons pour enrichir la salle conservée
  -- (après leur suppression, pour ne pas violer l'unicité de place_id).
  create temp table dupe_data on commit drop as
  select m.keep_id, g.place_id, nullif(g.address, '') as address,
         g.postal_code, g.city, g.chain_id
  from gym_dupes m
  join public.gyms g on g.id = m.dupe_id;

  -- Mémorise les salles principales portées par un doublon.
  create temp table primary_moves on commit drop as
  select d.user_id, m.keep_id
  from public.user_gyms d
  join gym_dupes m on m.dupe_id = d.gym_id
  where d.is_primary;

  -- Re-pointe user_gyms ; supprime la ligne si l'utilisateur a déjà la salle conservée.
  update public.user_gyms ug
  set gym_id = m.keep_id
  from gym_dupes m
  where ug.gym_id = m.dupe_id
    and not exists (
      select 1 from public.user_gyms x
      where x.user_id = ug.user_id and x.gym_id = m.keep_id
    );
  delete from public.user_gyms ug using gym_dupes m where ug.gym_id = m.dupe_id;

  -- Restaure le drapeau is_primary perdu lors d'une fusion de lignes.
  update public.user_gyms ug
  set is_primary = true
  from primary_moves pm
  where ug.user_id = pm.user_id
    and ug.gym_id = pm.keep_id
    and not ug.is_primary
    and not exists (
      select 1 from public.user_gyms x
      where x.user_id = pm.user_id and x.is_primary
    );

  -- Re-pointe les check-ins « Le Live ».
  update public.checkins ck
  set gym_id = m.keep_id
  from gym_dupes m
  where ck.gym_id = m.dupe_id;

  -- Supprime les doublons puis enrichit les salles conservées.
  delete from public.gyms g using gym_dupes m where g.id = m.dupe_id;
  get diagnostics _deleted = row_count;

  update public.gyms g
  set place_id    = coalesce(g.place_id, dd.place_id),
      address     = coalesce(nullif(g.address, ''), dd.address),
      postal_code = coalesce(g.postal_code, dd.postal_code),
      city        = coalesce(g.city, dd.city),
      chain_id    = coalesce(g.chain_id, dd.chain_id)
  from (
    select distinct on (keep_id) keep_id, place_id, address, postal_code, city, chain_id
    from dupe_data
    order by keep_id, (place_id is not null) desc, (address is not null) desc
  ) dd
  where g.id = dd.keep_id;

  raise notice 'Déduplication gyms : % doublon(s) fusionné(s)', _deleted;
end $$;

-- ---------------------------------------------------------------------------
-- e. Garde-fou permanent : un INSERT correspondant à une salle existante
--    (même nom normalisé ou même enseigne, à < 120 m) fusionne ses champs
--    dans la salle existante au lieu de créer un doublon.
-- ---------------------------------------------------------------------------
create or replace function public.gyms_merge_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _existing_id uuid;
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

  select g.id into _existing_id
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

  if _existing_id is null then
    return new;
  end if;

  update public.gyms
  set place_id    = coalesce(place_id, new.place_id),
      address     = coalesce(nullif(address, ''), nullif(new.address, '')),
      postal_code = coalesce(postal_code, new.postal_code),
      city        = coalesce(city, new.city),
      chain_id    = coalesce(chain_id, new.chain_id)
  where id = _existing_id;

  return null; -- annule l'insertion : la salle existante a été enrichie
end;
$$;

drop trigger if exists gyms_dedupe_on_insert on public.gyms;
create trigger gyms_dedupe_on_insert
  before insert on public.gyms
  for each row execute function public.gyms_merge_duplicate();

-- ---------------------------------------------------------------------------
-- f. nearby_gyms v2 : dédoublonnage à la lecture (filet de sécurité) et
--    enrichissement logo/couleur d'enseigne pour l'affichage.
--    (drop obligatoire : le type de retour change.)
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
      (g.place_id is not null) desc,
      (nullif(g.address, '') is not null) desc
  ) dedup
  order by distance_m
  limit 50;
$$;
