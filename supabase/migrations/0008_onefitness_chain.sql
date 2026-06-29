-- Les salles "One Fitness Club" (Strasbourg) sont une enseigne, pas des salles
-- indépendantes. On crée la chaîne et on y rattache les salles importées afin
-- qu'elles affichent le logo de l'enseigne au lieu de "Salle indépendante".
insert into public.gym_chains (name, brand_color) values
  ('One Fitness Club', '#E4002B')
on conflict (name) do nothing;

update public.gyms g
set chain_id = c.id
from public.gym_chains c
where c.name = 'One Fitness Club'
  and g.chain_id is null
  and g.name ilike '%one fitness%';
