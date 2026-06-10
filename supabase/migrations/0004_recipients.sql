-- =============================================================================
-- Dagens – byt de två fasta e-postfälten mot en lista av mottagare.
-- Varje mottagare: { "email": "...", "format": "pdf" | "text" }.
-- Kör i Supabase: SQL Editor → New query → klistra in → Run.
-- =============================================================================

alter table public.tenant_settings
  add column if not exists recipients jsonb not null default '[]'::jsonb;

alter table public.tenant_settings
  drop column if exists email_printer,
  drop column if exists email_neighborhood;
