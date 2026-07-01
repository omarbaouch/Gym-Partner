-- Corrige l'échec RLS à l'upload d'avatar ("new row violates row-level
-- security policy") : l'API Storage exécute l'INSERT/UPDATE avec un
-- RETURNING *, qui est lui-même soumis à une policy SELECT. La migration
-- 0005 avait supprimé la policy SELECT du bucket "avatars" en supposant
-- qu'elle n'était utile qu'à la lecture de l'URL publique (qui ne passe
-- pas par RLS) — mais le RETURNING de l'upload en a besoin, quel que soit
-- le bucket. Cf. https://supabase.com/docs/guides/troubleshooting/storage-error-403-forbidden-new-row-violates-row-level-security-policy-on-upload-a94384
create policy "avatars select own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
