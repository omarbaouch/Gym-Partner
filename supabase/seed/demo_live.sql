-- ============================================================================
-- Données de DÉMO « Le Live » : les membres démo sont check-in MAINTENANT à
-- la salle One Fitness, avec des focus variés et des arrivées échelonnées —
-- l'écran « En ce moment » ne doit jamais être vide pendant un pitch.
-- Pose aussi des intents (« Partant·e ») des membres démo vers les comptes
-- testeurs, pour montrer les badges et un match instantané en un tap.
--
-- Idempotent. À RELANCER JUSTE AVANT LA DÉMO pour rafraîchir les minuteurs.
-- ============================================================================

do $$
declare
  gid uuid;
  tester uuid;
begin
  select id into gid
  from public.gyms
  where name ilike '%one fitness%'
  order by name
  limit 1;

  if gid is null then
    raise exception 'Salle "One Fitness Club" introuvable : ajuste le filtre de salle.';
  end if;

  -- 7 membres démo présents, arrivées échelonnées, focus variés.
  insert into public.checkins (user_id, gym_id, focus, active_until, created_at)
  values
    ('d0000000-0000-4000-8000-000000000001', gid, 'Jambes',    now() + interval '110 min', now() - interval '5 min'),
    ('d0000000-0000-4000-8000-000000000002', gid, 'Cardio',    now() + interval '95 min',  now() - interval '12 min'),
    ('d0000000-0000-4000-8000-000000000003', gid, 'Push',      now() + interval '140 min', now() - interval '18 min'),
    ('d0000000-0000-4000-8000-000000000004', gid, 'Full body', now() + interval '80 min',  now() - interval '25 min'),
    ('d0000000-0000-4000-8000-000000000006', gid, 'Pull',      now() + interval '120 min', now() - interval '34 min'),
    ('d0000000-0000-4000-8000-000000000008', gid, 'Jambes',    now() + interval '70 min',  now() - interval '41 min'),
    ('d0000000-0000-4000-8000-000000000009', gid, 'Push',      now() + interval '150 min', now() - interval '55 min')
  on conflict (user_id) do update set
    gym_id = excluded.gym_id,
    focus = excluded.focus,
    active_until = excluded.active_until,
    created_at = excluded.created_at;

  -- Intents vers les comptes testeurs : badges « Partant·e » visibles, et
  -- accepter Emma/Chloé/Adrien déclenche un match immédiat (confetti).
  for tester in
    select id from auth.users
    where email in ('test@gmail.com', 'test2@gmail.com', 'test3@gmail.com')
  loop
    -- Le testeur doit fréquenter la salle pour voir ces membres.
    insert into public.user_gyms (user_id, gym_id, is_primary)
    values (tester, gid, false)
    on conflict (user_id, gym_id) do nothing;

    insert into public.intents (from_user, to_user)
    values
      ('d0000000-0000-4000-8000-000000000002', tester), -- Emma
      ('d0000000-0000-4000-8000-000000000006', tester), -- Chloé
      ('d0000000-0000-4000-8000-000000000009', tester)  -- Adrien
    on conflict do nothing;
  end loop;

  raise notice 'Démo Live : 7 check-ins + intents posés sur la salle %', gid;
end $$;
