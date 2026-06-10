-- =============================================================================
-- Dagens – multi-tenant grund: konton (tenants), profiler och Row Level Security
-- Kör detta i Supabase: Dashboard → SQL Editor → New query → klistra in → Run.
-- =============================================================================

-- 1. TENANTS --------------------------------------------------------------------
-- En rad per restaurang-konto. All framtida data hängs på en tenant.
create table if not exists public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  created_at timestamptz not null default now()
);

-- 2. PROFILES -------------------------------------------------------------------
-- Kopplar en auth-användare till exakt en tenant. (Modellen klarar flera
-- användare per tenant senare – "team" – men just nu blir det en per konto.)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  role       text not null default 'owner',
  created_at timestamptz not null default now()
);

-- 3. AUTO-PROVISIONERING --------------------------------------------------------
-- När en ny användare registrerar sig skapas automatiskt en ny tenant + profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
begin
  insert into public.tenants (name) values (null)
    returning id into new_tenant_id;

  insert into public.profiles (id, tenant_id, role)
    values (new.id, new_tenant_id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. HJÄLPFUNKTION --------------------------------------------------------------
-- Den inloggade användarens tenant_id. Används i alla RLS-policies nedan.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- 5. ROW LEVEL SECURITY ---------------------------------------------------------
alter table public.tenants  enable row level security;
alter table public.profiles enable row level security;

-- En användare ser/ändrar bara sin egen tenant.
drop policy if exists "tenant_select_own" on public.tenants;
create policy "tenant_select_own" on public.tenants
  for select using (id = public.current_tenant_id());

drop policy if exists "tenant_update_own" on public.tenants;
create policy "tenant_update_own" on public.tenants
  for update using (id = public.current_tenant_id());

-- En användare ser bara sin egen profil.
drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles
  for select using (id = auth.uid());

-- =============================================================================
-- MÖNSTER FÖR FRAMTIDA TENANT-DATA (t.ex. menyer) – läggs till i senare steg:
--
--   create table public.menus (
--     id         uuid primary key default gen_random_uuid(),
--     tenant_id  uuid not null references public.tenants(id) on delete cascade
--                  default public.current_tenant_id(),
--     ...
--   );
--   alter table public.menus enable row level security;
--   create policy "menus_tenant_isolation" on public.menus
--     for all
--     using (tenant_id = public.current_tenant_id())
--     with check (tenant_id = public.current_tenant_id());
--
-- Då gäller isoleringen automatiskt på databasnivå för all menydata.
-- =============================================================================
