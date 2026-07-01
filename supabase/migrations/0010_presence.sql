-- « Le Live » : check-ins éphémères — « je suis à la salle, maintenant ».
-- Cœur du repositionnement produit : voir qui s'entraîne dans SA salle en
-- temps réel, plutôt qu'un annuaire statique de profils.

create table public.checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  gym_id       uuid not null references public.gyms (id) on delete cascade,
  focus        text not null check (char_length(focus) between 1 and 30),
  active_until timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (user_id) -- un seul check-in actif par personne (re-check-in = upsert)
);

create index checkins_gym_active_idx on public.checkins (gym_id, active_until);

alter table public.checkins enable row level security;

-- Sans replica identity full, les événements Realtime DELETE ne portent que la
-- PK : le filtre client gym_id=eq.X ne matcherait jamais un check-out.
alter table public.checkins replica identity full;

-- Lecture : ses propres check-ins, et ceux des salles qu'on fréquente (hors
-- personnes bloquées — la RLS s'applique aussi aux événements Realtime, un
-- bloqué ne doit même pas émettre d'invalidation chez le bloqueur).
create policy "checkins select gym" on public.checkins
  for select to authenticated
  using (
    user_id = auth.uid()
    or (public.user_in_gym(gym_id) and not public.is_blocked_with(user_id))
  );
create policy "checkins insert own" on public.checkins
  for insert to authenticated
  with check (user_id = auth.uid() and public.user_in_gym(gym_id));
create policy "checkins update own" on public.checkins
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins delete own" on public.checkins
  for delete to authenticated using (user_id = auth.uid());

-- Se signaler présent (upsert : changer de focus/salle prolonge ou remplace).
create or replace function public.check_in(_gym uuid, _focus text, _minutes int default 120)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.user_in_gym(_gym) then raise exception 'not a member of this gym'; end if;
  if _minutes not between 15 and 300 then raise exception 'invalid duration'; end if;

  insert into checkins (user_id, gym_id, focus, active_until)
  values (auth.uid(), _gym, _focus, now() + make_interval(mins => _minutes))
  on conflict (user_id) do update set
    gym_id       = excluded.gym_id,
    focus        = excluded.focus,
    active_until = excluded.active_until,
    -- « ici depuis » ne repart de zéro que si le check-in précédent avait expiré
    created_at   = case when checkins.active_until < now() then now() else checkins.created_at end;
end;
$$;

-- Partir (DELETE => événement Realtime propre chez les autres membres).
create or replace function public.check_out()
returns void
language sql
security definer
set search_path = public
as $$
  delete from checkins where user_id = auth.uid();
$$;

-- Qui est là, maintenant, dans cette salle (hors soi, hors bloqués, hors
-- membres ayant quitté la salle avec un check-in encore actif).
create or replace function public.live_at_gym(_gym uuid)
returns table (
  user_id uuid, display_name text, avatar_url text, level text,
  focus text, since timestamptz, active_until timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id, p.display_name, p.avatar_url, p.level::text,
         c.focus, c.created_at, c.active_until
  from checkins c
  join profiles p on p.id = c.user_id
  where public.user_in_gym(_gym)
    and c.gym_id = _gym
    and c.active_until > now()
    and c.user_id <> auth.uid()
    and not public.is_blocked_with(c.user_id)
    and exists (
      select 1 from user_gyms ug
      where ug.user_id = c.user_id and ug.gym_id = _gym
    )
  order by c.created_at desc;
$$;

-- Durcissement : mêmes règles que 0005 (exécution réservée aux connectés).
revoke execute on function public.check_in(uuid, text, int) from public, anon;
revoke execute on function public.check_out() from public, anon;
revoke execute on function public.live_at_gym(uuid) from public, anon;
grant execute on function public.check_in(uuid, text, int) to authenticated;
grant execute on function public.check_out() to authenticated;
grant execute on function public.live_at_gym(uuid) to authenticated;

-- Temps réel : le tableau « Le Live » se met à jour sans rafraîchir.
alter publication supabase_realtime add table public.checkins;
