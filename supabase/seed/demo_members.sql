-- ============================================================================
-- Données de DÉMO : membres réalistes pour la salle "One Fitness Club".
-- But : remplir le feed et les profils pour une démo crédible (captures,
-- évaluation design). Idempotent (ON CONFLICT). À NE PAS utiliser en prod.
--
-- Lance-le dans le SQL Editor Supabase (ou via MCP apply_migration).
-- Mot de passe des comptes démo : Demo1234!  (emails @demo.gympartner.app)
-- ============================================================================

do $$
declare
  gid uuid;
begin
  select id into gid
  from public.gyms
  where name ilike '%one fitness%'
  order by name
  limit 1;

  if gid is null then
    raise exception 'Salle "One Fitness Club" introuvable : ajuste le filtre de salle.';
  end if;

  create temporary table _demo (
    id uuid, email text, name text, bio text,
    lvl public.fitness_level, goals text[], slots jsonb, avatar text
  ) on commit drop;

  insert into _demo (id, email, name, bio, lvl, goals, slots, avatar) values
    ('d0000000-0000-4000-8000-000000000001','lucas@demo.gympartner.app','Lucas Meyer',
     'Passionné de muscu depuis 5 ans. Toujours partant pour un gros leg day, je peux te corriger tes postures.',
     'intermediaire', array['Prise de masse','Force / Powerlifting'],
     '[{"day":"mon","period":"evening"},{"day":"wed","period":"evening"},{"day":"fri","period":"evening"}]'::jsonb,
     'https://randomuser.me/api/portraits/men/32.jpg'),

    ('d0000000-0000-4000-8000-000000000002','emma@demo.gympartner.app','Emma Schneider',
     'Je débute et je cherche quelqu''un de bienveillant pour rester régulière. Plutôt cardio + renfo léger.',
     'debutant', array['Perte de poids','Remise en forme'],
     '[{"day":"tue","period":"evening"},{"day":"thu","period":"evening"},{"day":"sat","period":"morning"}]'::jsonb,
     'https://randomuser.me/api/portraits/women/44.jpg'),

    ('d0000000-0000-4000-8000-000000000003','hugo@demo.gympartner.app','Hugo Klein',
     'Powerlifter, je prépare ma première compèt''. Squat / Bench / Deadlift, séances carrées le matin.',
     'avance', array['Force / Powerlifting','Préparation physique'],
     '[{"day":"mon","period":"morning"},{"day":"tue","period":"morning"},{"day":"thu","period":"morning"},{"day":"fri","period":"morning"}]'::jsonb,
     'https://randomuser.me/api/portraits/men/56.jpg'),

    ('d0000000-0000-4000-8000-000000000004','lea@demo.gympartner.app','Léa Muller',
     'Crossfit & running. On se motive pour les WOD du week-end ? J''aime l''intensité et la bonne ambiance.',
     'intermediaire', array['Crossfit','Cardio / Endurance'],
     '[{"day":"wed","period":"morning"},{"day":"fri","period":"morning"},{"day":"sun","period":"morning"}]'::jsonb,
     'https://randomuser.me/api/portraits/women/68.jpg'),

    ('d0000000-0000-4000-8000-000000000005','nathan@demo.gympartner.app','Nathan Weber',
     'Reprise du sport après une longue pause. Objectif : être régulier sans me cramer. Cherche un binôme chill.',
     'debutant', array['Remise en forme','Cardio / Endurance'],
     '[{"day":"mon","period":"evening"},{"day":"wed","period":"evening"}]'::jsonb,
     'https://randomuser.me/api/portraits/men/12.jpg'),

    ('d0000000-0000-4000-8000-000000000006','chloe@demo.gympartner.app','Chloé Fischer',
     '6 ans de pratique, coach en devenir. Je donne volontiers des conseils technique et nutrition.',
     'avance', array['Prise de masse','Crossfit'],
     '[{"day":"mon","period":"morning"},{"day":"tue","period":"morning"},{"day":"thu","period":"morning"},{"day":"sat","period":"morning"}]'::jsonb,
     'https://randomuser.me/api/portraits/women/21.jpg'),

    ('d0000000-0000-4000-8000-000000000007','theo@demo.gympartner.app','Théo Wagner',
     'Objectif -10 kg avant l''été. Cardio + renfo, je reste motivé si on est deux. Plutôt en soirée.',
     'intermediaire', array['Perte de poids','Cardio / Endurance'],
     '[{"day":"tue","period":"evening"},{"day":"thu","period":"evening"},{"day":"sat","period":"evening"}]'::jsonb,
     'https://randomuser.me/api/portraits/men/75.jpg'),

    ('d0000000-0000-4000-8000-000000000008','manon@demo.gympartner.app','Manon Bauer',
     'Team bas du corps et hip thrust. Bonne playlist obligatoire. Je m''entraîne après le boulot.',
     'intermediaire', array['Remise en forme','Prise de masse'],
     '[{"day":"mon","period":"evening"},{"day":"wed","period":"evening"},{"day":"fri","period":"evening"}]'::jsonb,
     'https://randomuser.me/api/portraits/women/90.jpg'),

    ('d0000000-0000-4000-8000-000000000009','adrien@demo.gympartner.app','Adrien Roth',
     'Squat 180 / Bench 120 / Deadlift 220. Je cherche un partenaire sérieux pour pousser lourd en sécurité.',
     'avance', array['Force / Powerlifting'],
     '[{"day":"mon","period":"evening"},{"day":"wed","period":"evening"},{"day":"fri","period":"evening"},{"day":"sat","period":"morning"}]'::jsonb,
     'https://randomuser.me/api/portraits/men/3.jpg');

  -- 1. Comptes auth (FK profiles.id -> auth.users.id)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated',
    d.email, crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', ''
  from _demo d
  on conflict (id) do nothing;

  -- 2. Profils
  insert into public.profiles
    (id, display_name, bio, avatar_url, level, goals, usual_slots, onboarded)
  select d.id, d.name, d.bio, d.avatar, d.lvl, d.goals, d.slots, true
  from _demo d
  on conflict (id) do update set
    display_name = excluded.display_name,
    bio          = excluded.bio,
    avatar_url   = excluded.avatar_url,
    level        = excluded.level,
    goals        = excluded.goals,
    usual_slots  = excluded.usual_slots,
    onboarded    = true;

  -- 3. Rattachement à la salle (membres affichés dans le feed)
  insert into public.user_gyms (user_id, gym_id, is_primary)
  select d.id, gid, true from _demo d
  on conflict (user_id, gym_id) do nothing;

  raise notice 'Démo : 9 membres ajoutés à la salle %', gid;
end $$;
