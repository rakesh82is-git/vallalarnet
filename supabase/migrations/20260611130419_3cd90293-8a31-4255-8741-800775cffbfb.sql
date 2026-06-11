
create extension if not exists pgcrypto;

create type public.signature_kind as enum ('digital', 'manual');

create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  kind public.signature_kind not null,
  name text not null,
  age int not null check (age between 1 and 120),
  country text not null,
  state text not null,
  district text not null,
  message text,
  phone_hash text not null unique,
  phone_masked text not null,
  signature_svg text,
  scan_url text,
  consent boolean not null default true,
  created_at timestamptz not null default now()
);

create index signatures_created_at_idx on public.signatures (created_at desc);
create index signatures_country_idx on public.signatures (country);
create index signatures_state_idx on public.signatures (state);

grant select on public.signatures to anon, authenticated;
grant all on public.signatures to service_role;

alter table public.signatures enable row level security;

create policy "Signatures are publicly readable"
  on public.signatures for select using (true);

create or replace view public.signatures_public as
select id, kind, name, country, state, district, message, signature_svg, scan_url, created_at
from public.signatures
order by created_at desc;

grant select on public.signatures_public to anon, authenticated;

create type public.gallery_kind as enum ('photo', 'video', 'fieldwork');

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  kind public.gallery_kind not null,
  title_ta text not null,
  title_en text not null,
  url text not null,
  thumb_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.gallery_items to anon, authenticated;
grant all on public.gallery_items to service_role;

alter table public.gallery_items enable row level security;

create policy "Gallery items are public"
  on public.gallery_items for select using (true);

insert into public.gallery_items (kind, title_ta, title_en, url, sort_order) values
  ('photo', 'சத்திய ஞான சபை — விடியல்', 'Sathya Gnana Sabha at dawn', '/seed/sanctuary.jpg', 1),
  ('photo', 'தைப்பூசம் ஒன்றுகூடல்', 'Thai Poosam gathering', '/seed/gathering.jpg', 2),
  ('photo', 'அணையா ஜோதி', 'The undying flame', '/seed/lamp.jpg', 3),
  ('photo', 'வள்ளலார் கருணை', 'Vallalar with all beings', '/seed/thanks.jpg', 4),
  ('photo', 'எண்கோண ஆலயம்', 'Octagonal sanctum', '/seed/sanctuary.jpg', 5),
  ('video', 'ஜோதி தரிசனம்', 'Jyothi darshan', '/seed/lamp.jpg', 6),
  ('video', 'தைப்பூசம் காணொளி', 'Thai Poosam highlights', '/seed/gathering.jpg', 7),
  ('fieldwork', 'வடலூர் சுற்றுச்சூழல் சுத்திகரிப்பு', 'Vadalur clean-up drive', '/seed/gathering.jpg', 8),
  ('fieldwork', 'விழிப்புணர்வு கூட்டம்', 'Awareness gathering', '/seed/sanctuary.jpg', 9);
