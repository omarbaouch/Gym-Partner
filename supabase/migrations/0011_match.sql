-- Match réciproque : le chat ne s'ouvre plus sans consentement mutuel.
-- « Partant·e pour s'entraîner » (intent) → si l'autre l'est aussi, match :
-- la conversation se crée, un premier message 🤝 la démarre (et déclenche le
-- webhook notify-message existant => push pour celui qui attendait).

create table public.intents (
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);

create index intents_to_idx on public.intents (to_user); -- badge « Partant·e »

alter table public.intents enable row level security;

create policy "intents insert own" on public.intents
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and public.shares_gym(to_user)
    and not public.is_blocked_with(to_user)
  );
create policy "intents select mine" on public.intents
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
create policy "intents delete own" on public.intents
  for delete to authenticated using (from_user = auth.uid());

create or replace function public.has_mutual_intent(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from intents where from_user = auth.uid() and to_user = _other)
     and exists (select 1 from intents where from_user = _other and to_user = auth.uid());
$$;

-- Verrouille la CRÉATION de conversation derrière le match réciproque.
-- Les conversations existantes restent accessibles (lookup AVANT le verrou) :
-- l'onglet Messages (my_conversations) et chat/[id] (lecture directe des
-- messages sous is_conversation_member) n'appellent de toute façon jamais
-- cette RPC — seule la création de nouvelles paires est conditionnée.
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

  select id into _id from conversations where user_a = _a and user_b = _b;
  if _id is not null then return _id; end if;

  if not public.has_mutual_intent(_other) then
    raise exception 'no mutual intent';
  end if;

  insert into conversations (user_a, user_b)
  values (_a, _b)
  on conflict (user_a, user_b) do nothing;

  select id into _id from conversations where user_a = _a and user_b = _b;
  return _id;
end;
$$;

-- Un seul appel côté client : pose l'intent, détecte le match, crée la
-- conversation et le premier message 🤝 dans la même transaction.
create or replace function public.express_intent(_other uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _conv uuid;
begin
  if auth.uid() is null or _other is null or auth.uid() = _other then
    raise exception 'invalid participants';
  end if;
  -- SECURITY DEFINER contourne la RLS d'intents : on revalide ici.
  if public.is_blocked_with(_other) then raise exception 'blocked'; end if;
  if not public.shares_gym(_other) then raise exception 'not in same gym'; end if;

  -- Déjà en conversation (match passé ou conversation historique) : idempotent.
  select id into _conv from conversations
  where user_a = least(auth.uid(), _other) and user_b = greatest(auth.uid(), _other);
  if _conv is not null then
    return jsonb_build_object('status', 'matched', 'conversation_id', _conv);
  end if;

  insert into intents (from_user, to_user)
  values (auth.uid(), _other)
  on conflict do nothing; -- double-tap sûr

  if public.has_mutual_intent(_other) then
    _conv := public.get_or_create_conversation(_other);
    -- Premier message : déclenche le webhook notify-message existant
    -- => push pour l'autre (celui qui attendait), conversation non vide.
    insert into messages (conversation_id, sender_id, content)
    values (_conv, auth.uid(),
            '🤝 Ça matche ! Vous êtes partants tous les deux — organisez votre première séance.');
    return jsonb_build_object('status', 'matched', 'conversation_id', _conv);
  end if;

  return jsonb_build_object('status', 'pending');
end;
$$;

-- État de la relation pour le CTA du profil. Une conversation préexistante
-- vaut « matched » (antériorité), sinon sent / received / none.
create or replace function public.intent_status(_other uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from conversations
                 where user_a = least(auth.uid(), _other)
                   and user_b = greatest(auth.uid(), _other))
      then jsonb_build_object(
        'status', 'matched',
        'conversation_id',
        (select id from conversations
         where user_a = least(auth.uid(), _other)
           and user_b = greatest(auth.uid(), _other)))
    when exists (select 1 from intents where from_user = auth.uid() and to_user = _other)
      then jsonb_build_object('status', 'sent')
    when exists (select 1 from intents where from_user = _other and to_user = auth.uid())
      then jsonb_build_object('status', 'received')
    else jsonb_build_object('status', 'none')
  end;
$$;

-- Durcissement : motif 0005.
revoke execute on function public.has_mutual_intent(uuid) from public, anon;
revoke execute on function public.express_intent(uuid) from public, anon;
revoke execute on function public.intent_status(uuid) from public, anon;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.has_mutual_intent(uuid) to authenticated;
grant execute on function public.express_intent(uuid) to authenticated;
grant execute on function public.intent_status(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
