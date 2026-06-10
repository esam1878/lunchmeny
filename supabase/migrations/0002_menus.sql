-- =============================================================================
-- Dagens – menyer per tenant (med Row Level Security)
-- Kör i Supabase: Dashboard → SQL Editor → New query → klistra in → Run.
-- (Förutsätter att 0001_init.sql redan körts.)
-- =============================================================================

create table if not exists public.menus (
  id         uuid primary key default gen_random_uuid(),
  -- Sätts automatiskt till den inloggade krögarens tenant.
  tenant_id  uuid not null references public.tenants (id) on delete cascade
               default public.current_tenant_id(),
  vecka      integer,
  dagar      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Snabb listning av en tenants menyer, nyast först.
create index if not exists menus_tenant_created_idx
  on public.menus (tenant_id, created_at desc);

-- Row Level Security: en krögare kan BARA läsa/skriva sina egna menyer.
alter table public.menus enable row level security;

drop policy if exists "menus_tenant_isolation" on public.menus;
create policy "menus_tenant_isolation" on public.menus
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
