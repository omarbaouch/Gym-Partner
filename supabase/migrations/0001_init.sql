-- Gym Partner — schéma initial (Postgres / Supabase)
-- Conventions : tout est protégé par Row Level Security (RLS).
-- Un profil n'est visible que par les membres d'une même salle, hors blocages.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "cube";
create extension if not exists "earthdistance";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.fitness_level as enum ('debutant', 'intermediaire', 'avance');

-- ---------------------------------------------------------------------------
-- Chaînes de salles (Basic Fit, Fitness Park, On Air, ...)
-- ---------------------------------------------------------------------------
create table public.gym_chains (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  logo_url    text,
  brand_color text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Salles
-- ---------------------------------------------------------------------------
create table public.gyms (
  id          uuid primary key default uuid_generate_v4(),
  chain_id    uuid references public.gym_chains (id) on delete set null,
  name        text not null,
  address     text,
  city        text,
  postal_code text,
  country     text not null default 'FR',
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);
-- Index géo pour la recherche par proximité (earthdistance).
create index gyms_earth_idx
  on public.gyms
  using gist (ll_to_earth(latitude, longitude));
create index gyms_city_idx on public.gyms (city);
create index gyms_chain_idx on public.gyms (chain_id);

-- ---------------------------------------------------------------------------
-- Profils (1-1 avec auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  bio          text,
  avatar_url   text,
  birth_year   int,
  gender       text,
  level        public.fitness_level not null default 'debutant',
  goals        text[] not null default '{}',
  usual_slots  jsonb not null default '[]', -- ex: [{"day":"mon","period":"evening"}]
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Salles fréquentées par un utilisateur (is_primary = salle affichée)
-- ---------------------------------------------------------------------------
create table public.user_gyms (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  gym_id     uuid not null references public.gyms (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, gym_id)
);
create index user_gyms_gym_idx on public.user_gyms (gym_id);
-- Une seule salle principale par utilisateur.
create unique index user_gyms_one_primary
  on public.user_gyms (user_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- Blocages
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Signalements (modération)
-- ---------------------------------------------------------------------------
create table public.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reported_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null,
  details      text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversations (paire ordonnée user_a < user_b pour éviter les doublons)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  content         text not null check (char_length(content) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tokens de notifications push (Expo)
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform        text,
  updated_at      timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

-- ===========================================================================
-- Fonctions utilitaires (SECURITY DEFINER pour éviter la récursion RLS)
-- ===========================================================================

-- Vrai si l'utilisateur courant partage au moins une salle avec _other.
create or replace function public.shares_gym(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_gyms a
    join user_gyms b on a.gym_id = b.gym_id
    where a.user_id = auth.uid()
      and b.user_id = _other
  );
$$;

-- Vrai si un blocage existe dans un sens ou l'autre entre l'utilisateur courant et _other.
create or replace function public.is_blocked_with(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = auth.uid() and blocked_id = _other)
       or (blocker_id = _other and blocked_id = auth.uid())
  );
$$;

-- Vrai si l'utilisateur courant participe à la conversation.
create or replace function public.is_conversation_member(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations
    where id = _conversation_id
      and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;

-- Crée (ou récupère) une conversation avec _other. Ordonne la paire.
create or replace function public.get_or_create_conversation(_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _a uuid := least(auth.uid(), _other);
  _b uuid := greatest(auth.uid(), _other);
  _id uuid;
begin
  if auth.uid() is null or _other is null or auth.uid() = _other then
    raise exception 'invalid participants';
  end if;
  if public.is_blocked_with(_other) then
    raise exception 'blocked';
  end if;

  insert into conversations (user_a, user_b)
  values (_a, _b)
  on conflict (user_a, user_b) do nothing;

  select id into _id from conversations where user_a = _a and user_b = _b;
  return _id;
end;
$$;

-- Crée le profil à l'inscription d'un nouvel utilisateur.
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
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Met à jour last_message_at sur la conversation à chaque message.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.gym_chains   enable row level security;
alter table public.gyms         enable row level security;
alter table public.profiles     enable row level security;
alter table public.user_gyms    enable row level security;
alter table public.blocks       enable row level security;
alter table public.reports      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages     enable row level security;
alter table public.push_tokens  enable row level security;

-- Référentiels (chaînes / salles) : lecture pour tout utilisateur authentifié.
create policy "chains readable" on public.gym_chains
  for select to authenticated using (true);
create policy "gyms readable" on public.gyms
  for select to authenticated using (true);

-- Profils : son propre profil OU un membre d'une salle commune non bloqué.
create policy "profiles select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (public.shares_gym(id) and not public.is_blocked_with(id))
  );
create policy "profiles insert self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- user_gyms : on gère les siens ; on peut lire ceux d'une salle qu'on fréquente.
create policy "user_gyms select shared" on public.user_gyms
  for select to authenticated
  using (
    user_id = auth.uid()
    or gym_id in (select gym_id from public.user_gyms where user_id = auth.uid())
  );
create policy "user_gyms manage own" on public.user_gyms
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Blocages : strictement privés à leur auteur.
create policy "blocks manage own" on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Signalements : un utilisateur crée et relit les siens.
create policy "reports insert own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports select own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

-- Conversations : visibles/créables uniquement par leurs participants.
create policy "conversations select member" on public.conversations
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- Messages : lecture/écriture réservées aux participants ; expéditeur = soi.
create policy "messages select member" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages insert member" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );
create policy "messages update read" on public.messages
  for update to authenticated
  using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

-- Tokens push : privés à leur propriétaire.
create policy "push_tokens manage own" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- Realtime (chat) — publier conversations et messages.
-- ===========================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
