-- Données de départ : principales chaînes de salles en France.
-- Les salles individuelles sont importées via supabase/seed/import_gyms.ts (OpenStreetMap).
insert into public.gym_chains (name, brand_color) values
  ('Basic-Fit',     '#FF7A00'),
  ('Fitness Park',  '#111111'),
  ('On Air',        '#E2001A'),
  ('Keep Cool',     '#00B0B9'),
  ('L''Orange Bleue', '#FF6A13'),
  ('Neoness',       '#E6007E'),
  ('Vita Liberté',  '#7AC143'),
  ('One Fitness Club', '#E4002B')
on conflict (name) do nothing;
