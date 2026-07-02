-- Phase « séances » + notifications autonomes.
-- 1) sessions : la boucle post-match (« Proposer une séance » dans le chat).
-- 2) push via pg_net directement depuis des triggers : plus AUCUNE étape
--    manuelle de webhook dashboard — nouveaux messages, intents reçus et
--    matchs notifient tout seuls (l'API push d'Expo ne demande pas d'auth).

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Séances
-- ---------------------------------------------------------------------------
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  proposer        uuid not null references public.profiles (id) on delete cascade,
  scheduled_at    timestamptz not null,
  status          text not null default 'proposee'
                  check (status in ('proposee', 'confirmee', 'annulee')),
  created_at      timestamptz not null default now()
);

create index sessions_conversation_idx on public.sessions (conversation_id, created_at desc);

alter table public.sessions enable row level security;
alter table public.sessions replica identity full;

-- Lecture par les participants ; écriture UNIQUEMENT via les RPC (comme
-- conversations : aucune policy insert/update => refus direct PostgREST).
create policy "sessions select member" on public.sessions
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

alter publication supabase_realtime add table public.sessions;

-- ---------------------------------------------------------------------------
-- Push : helper interne (jamais exposé) + triggers
-- ---------------------------------------------------------------------------
create or replace function public.push_to_user(_user uuid, _title text, _body text, _data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _payload jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'to', expo_push_token, 'sound', 'default',
    'title', _title, 'body', _body, 'data', _data))
  into _payload
  from push_tokens where user_id = _user;
  if _payload is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb);
end;
$$;

-- Nouveau message => push au destinataire (couvre aussi le message 🤝 du
-- match et les messages 📅/✅ de séance : un seul mécanisme pour tout).
create or replace function public.on_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _recipient uuid;
  _sender text;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
  into _recipient from conversations c where c.id = new.conversation_id;
  select display_name into _sender from profiles where id = new.sender_id;
  perform public.push_to_user(
    _recipient,
    coalesce(_sender, 'Nouveau message'),
    new.content,
    jsonb_build_object('conversationId', new.conversation_id));
  return new;
end;
$$;

create trigger on_message_push
  after insert on public.messages
  for each row execute function public.on_message_push();

-- Intent reçu (non réciproque) => push « untel est partant·e ». Si l'intent
-- crée un match, on se tait : le message 🤝 notifie déjà via le trigger
-- ci-dessus (pas de double notification).
create or replace function public.on_intent_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _sender text;
begin
  if exists (select 1 from intents
             where from_user = new.to_user and to_user = new.from_user) then
    return new;
  end if;
  select display_name into _sender from profiles where id = new.from_user;
  perform public.push_to_user(
    new.to_user,
    'Partant·e pour s''entraîner 🔥',
    coalesce(_sender, 'Un membre') || ' veut s''entraîner avec toi. Ouvre son profil pour accepter.',
    '{}'::jsonb);
  return new;
end;
$$;

create trigger on_intent_push
  after insert on public.intents
  for each row execute function public.on_intent_push();

-- ---------------------------------------------------------------------------
-- RPC séances
-- ---------------------------------------------------------------------------
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

  -- Une seule proposition en cours par conversation.
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

-- Ma prochaine séance confirmée (bannière de l'écran Ma salle).
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

-- Durcissement : motif 0005.
revoke execute on function public.push_to_user(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.on_message_push() from public, anon, authenticated;
revoke execute on function public.on_intent_push() from public, anon, authenticated;
revoke execute on function public.propose_session(uuid, timestamptz) from public, anon;
revoke execute on function public.respond_session(uuid, boolean) from public, anon;
revoke execute on function public.my_next_session() from public, anon;
grant execute on function public.propose_session(uuid, timestamptz) to authenticated;
grant execute on function public.respond_session(uuid, boolean) to authenticated;
grant execute on function public.my_next_session() to authenticated;
