-- Reprise dans le repo de la migration « sessions_push » déjà appliquée en
-- production (2026-07-02) : proposition / confirmation de séances d'entraînement
-- dans une conversation. Écrite de façon idempotente : la production possède
-- déjà ces objets, ce fichier aligne l'historique local sur l'état réel.

create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  proposer        uuid not null references public.profiles (id) on delete cascade,
  scheduled_at    timestamptz not null,
  status          text not null default 'proposee'
                  check (status in ('proposee', 'confirmee', 'annulee')),
  created_at      timestamptz not null default now()
);

create index if not exists sessions_conversation_idx
  on public.sessions (conversation_id, created_at desc);

alter table public.sessions enable row level security;

drop policy if exists "sessions select member" on public.sessions;
create policy "sessions select member" on public.sessions
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

-- Propose une séance : annule la proposition en cours, crée la nouvelle et
-- poste un message dans la conversation.
create or replace function public.propose_session(_conversation uuid, _at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if not public.is_conversation_member(_conversation) then
    raise exception 'not a member';
  end if;
  if _at <= now() then
    raise exception 'session must be in the future';
  end if;

  update sessions set status = 'annulee'
  where conversation_id = _conversation and status = 'proposee';

  insert into sessions (conversation_id, proposer, scheduled_at)
  values (_conversation, auth.uid(), _at)
  returning id into _id;

  insert into messages (conversation_id, sender_id, content)
  values (_conversation, auth.uid(),
          '📅 Séance proposée : ' ||
          to_char(_at at time zone 'Europe/Paris', 'DD/MM à HH24h') ||
          ' — réponds dans la carte.');
  return _id;
end;
$$;

-- Accepte ou décline une proposition (le proposeur ne peut pas s'auto-confirmer).
create or replace function public.respond_session(_session uuid, _accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s sessions%rowtype;
begin
  select * into s from sessions where id = _session;
  if s.id is null or not public.is_conversation_member(s.conversation_id) then
    raise exception 'not a member';
  end if;
  if s.status <> 'proposee' then
    raise exception 'already answered';
  end if;

  if _accept then
    if s.proposer = auth.uid() then
      raise exception 'cannot confirm own proposal';
    end if;
    update sessions set status = 'confirmee' where id = _session;
    insert into messages (conversation_id, sender_id, content)
    values (s.conversation_id, auth.uid(),
            '✅ Séance confirmée : ' ||
            to_char(s.scheduled_at at time zone 'Europe/Paris', 'DD/MM à HH24h') ||
            ' — on s''y retrouve !');
  else
    update sessions set status = 'annulee' where id = _session;
    insert into messages (conversation_id, sender_id, content)
    values (s.conversation_id, auth.uid(), '❌ Proposition déclinée.');
  end if;
end;
$$;

-- Prochaine séance confirmée de l'utilisateur courant.
create or replace function public.my_next_session()
returns table (conversation_id uuid, scheduled_at timestamptz, other_name text)
language sql
stable
security definer
set search_path = public
as $$
  select s.conversation_id, s.scheduled_at, p.display_name
  from sessions s
  join conversations c on c.id = s.conversation_id
  join profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  where (c.user_a = auth.uid() or c.user_b = auth.uid())
    and s.status = 'confirmee'
    and s.scheduled_at > now()
  order by s.scheduled_at
  limit 1;
$$;

-- Realtime : publier les séances (garde : idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
end $$;
