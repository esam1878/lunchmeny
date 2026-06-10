-- =============================================================================
-- Dagens – per-krögare inställningar (logga, mottagare, "Varje dag", Facebook)
-- Kör i Supabase: SQL Editor → New query → klistra in → Run.
-- (Förutsätter att 0001 och 0002 redan körts.)
-- =============================================================================

-- 1. INSTÄLLNINGAR (en rad per tenant) -----------------------------------------
create table if not exists public.tenant_settings (
  tenant_id          uuid primary key references public.tenants (id) on delete cascade
                       default public.current_tenant_id(),
  logo_path          text,                       -- sökväg i Storage-bucketen "logos"
  email_printer      text,                       -- mottagare: skrivarpersonen
  email_neighborhood text,                       -- mottagare: kvartersmenyn
  facebook_page      text,                       -- vald Facebook-sida/koppling
  everyday_pasta     jsonb not null default '[]'::jsonb,  -- "Varje dag": pasträtter
  everyday_meat      jsonb not null default '[]'::jsonb,  -- "Varje dag": kötträtter
  everyday_salad     jsonb not null default '[]'::jsonb,  -- "Varje dag": sallader
  updated_at         timestamptz not null default now()
);

alter table public.tenant_settings enable row level security;

drop policy if exists "settings_tenant_isolation" on public.tenant_settings;
create policy "settings_tenant_isolation" on public.tenant_settings
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- 2. STORAGE-BUCKET FÖR LOGGOR --------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', false)
  on conflict (id) do nothing;

-- En användare får bara läsa/skriva/radera i sin EGEN mapp (prefixad med user-id).
drop policy if exists "logos_own_folder" on storage.objects;
create policy "logos_own_folder" on storage.objects
  for all
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
