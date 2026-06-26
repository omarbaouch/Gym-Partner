-- Corrige une récursion RLS : la policy SELECT de user_gyms se référençait
-- elle-même (sous-requête sur user_gyms), provoquant
-- "infinite recursion detected in policy" à chaque lecture
-- => sélection de salle et liste des membres impossibles.
-- On remplace la sous-requête par une fonction SECURITY DEFINER.

create or replace function public.user_in_gym(_gym uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_gyms where user_id = auth.uid() and gym_id = _gym
  );
$$;

revoke execute on function public.user_in_gym(uuid) from public, anon;
grant execute on function public.user_in_gym(uuid) to authenticated;

drop policy if exists "user_gyms select shared" on public.user_gyms;
create policy "user_gyms select shared" on public.user_gyms
  for select to authenticated
  using (user_id = auth.uid() or public.user_in_gym(gym_id));
