
drop view if exists public.signatures_public;
create view public.signatures_public
  with (security_invoker = true) as
select id, kind, name, country, state, district, message, signature_svg, scan_url, created_at
from public.signatures
order by created_at desc;
grant select on public.signatures_public to anon, authenticated;
