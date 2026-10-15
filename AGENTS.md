# AGENTS.md ERP (multi-tenant School Management SaaS, web+ mobile)
## Product
ERP serves many schools from one codebase. Roles: super_admin, school_admin, accountant, teacher, student, parent.
Functional reference screenshots are in /reference: use them for behaviour only. Never copy third-party branding, text, icons, CSS or code.
The product name lives only in packages/config/brand.ts.
## Stack
pnpm + Turborepo monorepo, TypeScript strict.
apps/web: Next.js App Router, Tailwind, shadcn/ui, TanStack Table + Query, React Hook Form + zod.
apps/mobile: Expo Expo Router + NativeWind.
supabase/: migrations, seed, Edge Functions, pgTAP tests.
Shared: packages/core (business logic), packages/types, packages/ui, packages/config.
## Before every task
1. Read /docs/PRD.md, DATA_MODEL.md, PERMISSIONS.md, SCREENS.md, DESIGN_SYSTEM.md and PROGRESS.md.
2. Show a plan: files to create or change, migrations, RLS policies, tests. Wait for my approval.
3. Work in small steps. Do not refactor unrelated code.
## Database and security
Every table has school_id, created_at, updated_at, deleted_at (where soft delete applies) and RLS enabled. No table ships without policies and pgTAP tests.
Role and school_id come from JWT custom claims (Auth Hook). Never trust client-supplied school_id or role.
Service-role key only in Edge Functions or server code. Never in web or mobile bundles.
All schema changes are SQL files in supabase/migrations. Never change the database by hand.
Multi-table writes go through SQL functions (one transaction). Payments and bulk generation use idempotency keys.
Money is integer minor units. The fee ledger is append-only; balances are computed.
Dates in UTC; display in the school timezone.
Private storage buckets, paths prefixed by school_id, signed URLs.
Audit-log fee edits, marks changes, deletions, role changes and impersonation.
## Code
Business logic in packages/core. Components never run raw queries.
Validate all input with zod schemas shared in packages/types. No any.
Server-side pagination, search, sort and filter. Index school_id plus filter columns.
Bulk jobs run in the background with progress and an error report.
SMS, email, WhatsApp and payments go through adapter interfaces.
Web auth uses Supabase SSR cookies, not localStorage tokens.
## UI (see DESIGN_SYSTEM.md)
Calm, spacious, data-first. Neutral slate plus one indigo primary. Light and dark mode. Inter 14px, 4px grid, 8px radius, Lucide icons.
Page pattern: title, breadcrumb, primary action top right, filter bar, table or cards.
Every screen has loading, empty and error states. Confirm destructive actions. Toast results.
WCAG AA, keyboard usable, works from 360px width. i18n and RTL from day one: no hardcoded strings.
## Definition of done
Migration + RLS + pgTAP tests, service layer, web screens, mobile screens where listed in SCREENS.md, seed data, unit tests, one Playwright flow, loading/empty/error states, i18n strings, docs updated, PROGRESS.md updated.
## Never
Never disable RLS or weaken a policy to make a test pass.
Never skip, delete or loosen a failing test. Fix the cause.
Never claim something works without running it. Report failures honestly.
Never run destructive database commands against staging or production.
Never hardcode secrets or commit .env files.