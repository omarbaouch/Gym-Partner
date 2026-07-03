-- Changement de salle : tous les cas de figure gérés en une transaction.
--
-- Avant : le client posait is_primary en deux requêtes, sans nettoyage.
-- Conséquences quand quelqu'un changeait de salle :
--   - il restait « inscrit » dans l'ancienne salle (fantôme dans la liste des
--     membres, visible par les anciens co-membres, et réciproquement) ;
--   - son check-in « Le Live » restait actif dans l'ancienne salle ;
--   - deux requêtes séparées = état incohérent possible en cas d'échec partiel.
--
-- Après :
--   1. has_conversation_with() : les interlocuteurs d'une conversation restent
--      mutuellement visibles même s'ils ne partagent plus de salle (sinon le
--      profil d'un partenaire de chat disparaîtrait après un changement).
--   2. set_primary_gym() : RPC transactionnelle qui quitte les autres salles,
--      pose la nouvelle salle principale et retire les check-ins obsolètes.

-- ---------------------------------------------------------------------------
-- 1. Visibilité : une conversation existante maintient le lien entre profils.
-- ---------------------------------------------------------------------------
create or replace function public.has_conversation_with(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations
    where (user_a = auth.uid() and user_b = _other)
       or (user_a = _other and user_b = auth.uid())
  );
$$;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or ((public.shares_gym(id) or public.has_conversation_with(id))
        and not public.is_blocked_with(id))
  );

-- ---------------------------------------------------------------------------
-- 2. Changement de salle transactionnel.
--    Cas couverts :
--    - re-sélection de la salle actuelle          -> no-op (check-in conservé) ;
--    - changement de salle                        -> quitte l'ancienne (plus de
--      fantôme dans sa liste de membres), check-in de l'ancienne salle retiré ;
--    - salle inexistante                          -> erreur explicite ;
--    - première salle (aucune adhésion)           -> simple insertion ;
--    - invariant « une seule salle principale »   -> garanti dans la transaction.
--    Les conversations/messages/séances existants survivent (visibilité assurée
--    par has_conversation_with) ; les intents restent (sans effet entre membres
--    de salles différentes).
-- ---------------------------------------------------------------------------
create or replace function public.set_primary_gym(_gym uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from gyms where id = _gym) then
    raise exception 'unknown gym';
  end if;

  -- Quitte les autres salles (libère aussi l'index « une seule primaire »).
  delete from user_gyms
  where user_id = auth.uid() and gym_id <> _gym;

  -- Retire les check-ins qui ne correspondent plus à la salle choisie.
  delete from checkins
  where user_id = auth.uid() and gym_id <> _gym;

  -- Pose (ou confirme) la salle principale.
  insert into user_gyms (user_id, gym_id, is_primary)
  values (auth.uid(), _gym, true)
  on conflict (user_id, gym_id) do update set is_primary = true;
end;
$$;
