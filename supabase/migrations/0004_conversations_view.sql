-- Phase 3 — liste de conversations enrichie pour l'utilisateur courant.
-- Renvoie pour chaque conversation : l'interlocuteur, le dernier message,
-- et le nombre de messages non lus reçus.

create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  other_avatar    text,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    other.id,
    other.display_name,
    other.avatar_url,
    lm.content,
    c.last_message_at,
    coalesce(u.cnt, 0)
  from conversations c
  join profiles other
    on other.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (
    select content
    from messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as cnt
    from messages m
    where m.conversation_id = c.id
      and m.sender_id <> auth.uid()
      and m.read_at is null
  ) u on true
  where c.user_a = auth.uid() or c.user_b = auth.uid()
  order by c.last_message_at desc nulls last;
$$;
