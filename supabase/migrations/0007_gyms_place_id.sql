-- Déduplication fiable des imports Google Places.
alter table public.gyms add column if not exists place_id text;
create unique index if not exists gyms_place_id_key
  on public.gyms (place_id) where place_id is not null;
