-- Phase 1 — onboarding & avatars.

-- Indicateur : le profil a-t-il terminé l'onboarding ?
alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- ---------------------------------------------------------------------------
-- Stockage des avatars (bucket public en lecture, écriture réservée au propriétaire)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique des avatars.
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Un utilisateur n'écrit que dans son propre dossier : avatars/<user_id>/...
create policy "avatars insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
