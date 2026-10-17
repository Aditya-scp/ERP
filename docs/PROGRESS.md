# Project Implementation Roadmap & Progress Log (PROGRESS.md)

This document serves as the authoritative, live engineering progress tracker for **ERP**, an enterprise multi-tenant school management SaaS platform.

Per [AGENTS.md](file:///c:/Users/DELL/ERP/AGENTS.md), this document must be reviewed before every task and updated immediately upon completion of any engineering increment.

---

## 1. Executive Status & Engineering Metrics

### 1.1 High-Level Progress Overview

| Layer / Component Area | Target Scope | Current Status | Completion % | Primary Deliverable Artifacts |
| :--- | :--- | :---: | :---: | :--- |
| **Milestone 0: Specification Suite** | 7 Architecture Documents | **Completed** | **100%** | `PRD.md`, `DATA_MODEL.md`, `PERMISSIONS.md`, `SCREENS.md`, `DESIGN_SYSTEM.md`, `OPEN_QUESTIONS.md`, `PROGRESS.md` |
| **Milestone 1: Monorepo & Tooling** | Turborepo, pnpm Workspaces, Next 16, Expo SDK 57 | **Completed** | **100%** | Root configs, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/web`, `apps/mobile`, `@erp/config`, `@erp/types`, `@erp/core`, `@erp/ui`, `supabase/` |
| **Milestone 2: Database & Security** | 113 Tables, Auth Hook, RLS, pgTAP | Pending Start | 0% | `supabase/migrations/`, `supabase/tests/`, SQL triggers, Auth Hook in `public` |
| **Milestone 3: Shared Core Packages**| `packages/core`, `types`, `ui`, `config` | Pending Start | 0% | Business logic, Zod validation, shadcn/ui components, brand config |
| **Milestone 4: Web Client (`apps/web`)**| Next.js App Router, SSR Auth, 24 Modules | Pending Start | 0% | Route hierarchy, TanStack tables, layouts, dialogs, print CSS |
| **Milestone 5: Mobile Client (`apps/mobile`)**| Expo Router, NativeWind, Persona Portals | Pending Start | 0% | Mobile routes, offline SQLite cache, biometrics, child switcher |
| **Milestone 6: Verification & E2E** | Unit Tests, pgTAP Suite, Playwright | Pending Start | 0% | Vitest unit tests, Playwright flows per module, axe-core audit |

---

### 1.2 Strict Definition of Done (DoD)
No feature module, database migration, or screen is marked as complete without fulfilling all twelve criteria defined in [AGENTS.md](file:///c:/Users/DELL/ERP/AGENTS.md):

$$\text{Done} = \begin{cases}
1. & \text{SQL Migration in } \texttt{supabase/migrations/} \text{ (zero manual DB modifications)} \\
2. & \text{PostgreSQL Row Level Security (RLS) enabled on every tenant table with explicit policies} \\
3. & \text{pgTAP test suite validating tenant isolation, role barriers, and negative write rejections} \\
4. & \text{Pure business logic implemented in } \texttt{packages/core} \text{ (no raw queries in UI components)} \\
5. & \text{Shared Zod validation schemas in } \texttt{packages/types} \text{ (strict TypeScript, zero } \texttt{any}\text{)} \\
6. & \text{Web screens in } \texttt{apps/web} \text{ matching specifications in } \texttt{SCREENS.md} \\
7. & \text{Mobile screens in } \texttt{apps/mobile} \text{ for listed persona routes in } \texttt{SCREENS.md} \\
8. & \text{Deterministic multi-tenant seed data in } \texttt{supabase/seed.sql} \\
9. & \text{Comprehensive unit test coverage in Vitest for business calculations and adapters} \\
10. & \text{At least one end-to-end Playwright workflow testing positive and negative paths} \\
11. & \text{Complete Tri-State UI handling: Loading skeletons, Empty states with CTA, Error recovery} \\
12. & \text{Zero hardcoded strings: all text uses i18n tokens (English } \texttt{en-IN} \text{ + Hindi } \texttt{hi-IN}\text{), RTL ready}
\end{cases}$$

---

## 2. Phased Implementation Roadmap

### Phase 0: Architecture & Documentation (Completed)
- [x] **`docs/PRD.md`**: Complete product requirements across all 23 functional modules, role-based user stories, concrete business rules with real-number calculations (rupees/paise), edge cases, and India localization (CBSE/State presets, INR locking, TRAI DLT SMS, DPDP Act 2023 compliance).
- [x] **`docs/DATA_MODEL.md`**: Complete relational schema covering all 113 tables with `school_id`, constraints, foreign keys, triggers (immutable fee ledger, immutable school_id, locked exam terms), settings registry, and payment/job queue architectures.
- [x] **`docs/PERMISSIONS.md`**: Complete security matrix defining 133 granular permission tokens, public token hook (`public.custom_access_token_hook`), private helper functions (`app.*`), automated custom role seeding (6 system roles), and comprehensive pgTAP test harness.
- [x] **`docs/SCREENS.md`**: Complete user interface catalog spanning Module 0 (Authentication & Account) through Module 23 (Public School Landing), detailed component breakdowns, Web (`/app/*`) and Mobile (`/(persona)/*`) file routes, tri-state specifications, and permission token bindings.
- [x] **`docs/DESIGN_SYSTEM.md`**: Visual design language specification: Slate neutrals + Indigo primary (`#4F46E5`), exact HSL tokens, WCAG 2.1 AA contrast verification table ($\ge 4.5:1$), coarse-pointer touch targets ($\ge 44\text{px}$), Inter with `tabular-nums`, Noto Sans Devanagari subsetting, reconciled hotkeys (`F2`, `F4`, `F8`, `F9`, `Esc`), and print styling engine.
- [x] **`docs/OPEN_QUESTIONS.md`**: Complete architectural decisions register resolving all 23 baseline open questions (Decisions 1–23) with zero pending ambiguities.
- [x] **`docs/PROGRESS.md`**: Central roadmap and progress dashboard initialized.

---

### Phase 1: Monorepo Foundation & Tooling Setup (Next Milestone)
- [ ] Initialize pnpm workspace and Turborepo configuration (`turbo.json`, `pnpm-workspace.yaml`).
- [ ] Configure root TypeScript settings (`tsconfig.base.json`) with strict mode, `noImplicitAny`, and path aliases.
- [ ] Configure ESLint and Prettier across all workspaces with import ordering and accessibility rules.
- [ ] Configure Tailwind CSS and PostCSS presets in `packages/config/tailwind.config.ts`.
- [ ] Initialize Supabase CLI project structure (`supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`).
- [ ] Implement brand isolation anchor in `packages/config/brand.ts` (ensuring product name lives nowhere else).
- [ ] Configure Vitest test runner with [`packages/config/design-tokens.contrast.test.ts`](file:///c:/Users/DELL/ERP/packages/config/design-tokens.contrast.test.ts).

---

### Phase 2: Supabase Database Infrastructure & RLS Test Harness
- [ ] Generate foundational migration `00001_core_schemas_and_helpers.sql`:
  - Create private internal schema `app`.
  - Install extensions: `pgcrypto`, `uuid-ossp`, `pg_trgm`.
  - Author JWT claim helper functions in `app` with fixed cast precedence: `app.jwt_school_id()`, `app.jwt_app_role()`, `app.is_super_admin()`, `app.has_permission()`.
  - Author scope security definers: `app.can_see_student()`, `app.can_see_enrollment()`, `app.teaches_section()`, `app.teaches_schedule()`.
- [ ] Author custom access token hook `public.custom_access_token_hook` and bind to Supabase Auth (`supabase_auth_admin` execution grant).
- [ ] Generate migration `00002_initial_schema.sql` implementing all 113 tables from `DATA_MODEL.md`.
- [ ] Generate migration `00003_triggers_and_immutability.sql`:
  - Immutable fee ledger trigger (`trg_fee_ledger_no_update_delete`).
  - Immutable school_id trigger (`trg_enforce_school_id_immutability`) bound to all tenant tables.
  - Locked exam terms trigger (`trg_enforce_exam_marks_lock`).
  - Audited term unlock function (`app.unlock_exam_term`).
- [ ] Generate migration `00004_rls_policies.sql` establishing SELECT, INSERT, and UPDATE policies across all 113 tables (zero blanket DELETE).
- [ ] Author deterministic seed script `supabase/seed.sql` provisioning multi-tenant test schools, 6 system custom roles per school, teachers, students, guardians, and fee structures.
- [ ] Implement pgTAP test suite `supabase/tests/database/01_rls_policies.test.sql` (8 scenario tests verifying tenant isolation, cross-school barriers, and teacher/parent scope).

---

### Phase 3: Shared Libraries & Business Logic Layer
- [ ] **`packages/types`**:
  - Export database TypeScript types generated via Supabase CLI (`supabase gen types typescript`).
  - Author and export Zod validation schemas for every entity input and API payload (strict runtime validation).
- [ ] **`packages/core`**:
  - Implement fee calculation engine: half-up rounding to integer minor units, late fine assessment (`incremental` vs `retroactive`), waterfall payment allocation FIFO, advance credit offsets.
  - Implement academic evaluation engine: weighted composite marks calculation, pass mark inheritance hierarchy, grading scale GPA mapper, tie-breaker ranking algorithm (`1, 2, 2, 4`).
  - Implement mid-month admission proration calculator (`full_month`, `half_after_cutoff_day`, `daily_prorata`).
  - Implement pluggable adapter interfaces: `PaymentGatewayAdapter` (Razorpay split settlement), `NotificationAdapter` (TRAI DLT SMS + Console fallback).
- [ ] **`packages/ui`**:
  - Author core component primitives based on shadcn/ui and Radix UI: `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `DataTable`, `Badge`, `ModalDialog`, `SheetDrawer`, `Skeleton`.
  - Implement Tri-State UI wrappers (`LoadingSkeleton`, `EmptyState`, `ErrorBoundaryCard`).
  - Author dedicated `@media print` CSS engine for A4/A5 challans and mark sheets.

---

### Phase 4: Web Application Shell & Authentication (`apps/web`)
- [ ] Initialize Next.js App Router application in `apps/web`.
- [ ] Implement Supabase SSR cookie authentication using `@supabase/ssr` (`middleware.ts`, route guards).
- [ ] Implement Module 0 screens:
  - Screen 0.1: Login with Multi-Tenant Slug & Persona Detection.
  - Screen 0.2: Forgot Password & Magic Recovery Link.
  - Screen 0.3: Password Reset Form.
  - Screen 0.4: User Invitation Acceptance & Password Setup.
  - Screen 0.5: Forced First-Login Password Change.
  - Screen 0.6: 403 Forbidden Access Page.
  - Screen 0.7: 404 Page Not Found.
  - Screen 0.8: School Tenant Switcher (`/app/switch-school`).
  - Screen 0.9: My Account & Profile Settings (`/app/account`, `/app/account/delete`).
- [ ] Implement Super-Admin Impersonation persistent warning watermark banner (`saas:impersonate`).
- [ ] Author Playwright E2E test verifying authentication lifecycle, tenant switching, and role-based route guards.

---

### Phase 5: Feature Modules Implementation (Modules 1–23)
*(Detailed module tracking in Section 3 below)*

---

### Phase 6: Mobile Client Application (`apps/mobile`)
- [ ] Initialize Expo project using Expo Router v3 and NativeWind in `apps/mobile`.
- [ ] Implement biometric authentication (FaceID / Fingerprint) and hardware-backed encrypted token storage.
- [ ] Implement Parent Multi-Child Switchboard portal (`/(parent)/*`).
- [ ] Implement Student Portal (`/(student)/*`).
- [ ] Implement Teacher Attendance & Evaluation POS (`/(teacher)/*`).
- [ ] Implement Accountant Rapid Collection terminal (`/(accountant)/*`).
- [ ] Implement SQLite offline-lite caching for queued attendance punches and local roster reads.

---

### Phase 7: Verification, Hardening & Security Audit
- [ ] Run full security audit workflow (`.agent/workflows/security-audit.md`):
  - Verify zero tables without RLS.
  - Execute automated cross-tenant read/write penetration tests.
  - Verify zero service-role keys exposed in web/mobile bundles.
  - Verify all storage buckets enforce `school_id/` private path prefixing.
- [ ] Run automated axe-core accessibility audit verifying WCAG 2.1 AA across all screens.
- [ ] Run high-volume load test on fee voucher bulk batch generator (`job_queue` worker performance).
- [ ] Execute DPDP Act 2023 72-hour incident notification drill on `data_breach_logs`.

---

## 3. Granular Module-by-Module Progress Matrix

The following table catalogs the end-to-end development status across all 24 modules (Modules 0 through 23), linking specifications, database tables, permissions, routes, and testing:

| Module # & Name | Priority | DB Tables Count | Permission Tokens | Web Routes | Mobile Routes | Migration Status | RLS & pgTAP | Service Layer | Web UI | Mobile UI | Overall Status |
| :--- | :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **0. Auth & Account** | **P0** | 4 tables | Public / Auth | 9 screens | 9 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **1. Academic Setup** | **P0** | 8 tables | 6 tokens | 6 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **2. Students SIS** | **P0** | 7 tables | 9 tokens | 6 screens | 2 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **3. Staff & HR** | **P0/P1** | 7 tables | 6 tokens | 7 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **4. Attendance** | **P0/P1** | 4 tables | 7 tokens | 6 screens | 2 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **5. Timetable** | **P1** | 4 tables | 5 tokens | 5 screens | 2 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **6. Exams & Marks** | **P0/P1** | 8 tables | 8 tokens | 8 screens | 2 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **7. Fees & POS** | **P0** | 13 tables | 11 tokens | 17 screens | 2 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **8. Accounts** | **P1** | 6 tables | 6 tokens | 6 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **9. Payroll** | **P1** | 5 tables | 6 tokens | 5 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **10. Communication** | **P0/P1** | 5 tables | 6 tokens | 7 screens | 4 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **11. LMS & Homework** | **P1/P2** | 4 tables | 6 tokens | 5 screens | 3 screens | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **12. Library** | **P2** | 4 tables | 5 tokens | 5 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **13. Inventory** | **P2** | 6 tables | 5 tokens | 5 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **14. Transport** | **P2** | 5 tables | 5 tokens | 5 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **15. Hostel** | **P2** | 4 tables | 5 tokens | 5 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **16. Certificates** | **P1** | 3 tables | 3 tokens | 4 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **17. Admissions CRM**| **P1** | 3 tables | 4 tokens | 4 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **18. Reports** | **P0/P1** | Dynamic | 5 tokens | 4 screens | 1 screen | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **19. Roles & Perms** | **P0** | 4 tables | 4 tokens | 3 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **20. Portals** | **P0** | Composite | 6 tokens | 5 screens | 4 personas | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **21. Settings** | **P0/P1** | 5 tables | 6 tokens | 5 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **22. SaaS Platform** | **P1** | 4 tables | 6 tokens | 4 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **23. Public Website**| **P2** | 3 tables | Public / CMS | 3 screens | N/A | Pending | Pending | Pending | Pending | Pending | **Spec Ready** |
| **Total Platform** | | **113 Tables**| **133 Tokens** | **134 Screens** | **37 Screens** | **0 / 113** | **0 / 113** | **0 / 24** | **0 / 134** | **0 / 37** | **Ready for Dev** |

---

## 4. Architectural Decisions Index (Codified in `OPEN_QUESTIONS.md`)

The following 23 confirmed architectural choices govern all downstream development:

| Decision # | Architectural Domain | Summary of Confirmed Choice | Implementation Location |
| :-: | :--- | :--- | :--- |
| **1** | Fee Ledger Scoping | `fee_ledger_entries` references `enrollment_id`. Session rollover carries net arrears/advance into a single signed `opening_balance` entry. | `PRD.md` Sec 3.3, `DATA_MODEL.md` Sec 3.9 |
| **2** | Sibling Discounts | Strict guardian linking via `student_guardians`. Eldest child pays 100%; younger siblings receive progressive discounts on tuition head. | `PRD.md` Sec 3.2, `DATA_MODEL.md` Sec 3.4 & 3.9 |
| **3** | Rounding Standard | Half-up rounding away from zero applied separately to each line item before summing to integer minor units. | `PRD.md` Sec 3.8, `DATA_MODEL.md` Sec 1.3 |
| **4** | Late Fine Typology | Two non-compounding modes: `fixed_amount` or `per_day` with optional cap and grace period. Zero compounding interest. | `PRD.md` Sec 3.1, `DATA_MODEL.md` Sec 3.9 |
| **5** | Class Ranking Mode | Standard Competition Ranking (`1, 2, 2, 4`) default (`rank_mode = 'shared'`), with 4-stage deterministic tie-breaker (`'tie_break'`). | `PRD.md` Sec 3.6, `DATA_MODEL.md` Sec 3.8 |
| **6** | Job Queue | Native Postgres `job_queue` table with atomic row-level locking (`SKIP LOCKED`) processed via Supabase Edge Functions. | `DATA_MODEL.md` Sec 3.24 |
| **7** | Accounts Scope (V1) | Pragmatic cash book, income/expense categories, cash/bank accounts, daily closing, and P&L. No double-entry GL in V1. | `PRD.md` Module 8, `DATA_MODEL.md` Sec 3.10 |
| **8** | Payment Gateway | Decoupled `PaymentGatewayAdapter` supporting non-custodial direct split settlement to school bank accounts (zero platform custody). | `PRD.md` Sec 1.2, `DATA_MODEL.md` Sec 3.23 |
| **9** | Advance Payments | Signed ledger balance (`amount bigint`). Overpayments yield negative balance, auto-allocated on next voucher without duplicate entries. | `PRD.md` Sec 3.9, `DATA_MODEL.md` Sec 3.9 |
| **10** | Student Evaluations | Nullable `exam_marks`: NULL for absent (counted as 0 in total), NULL for exempt (completely excluded from numerator and denominator). | `PRD.md` Module 6, `DATA_MODEL.md` Sec 3.8 |
| **11** | Grace Fine Mode | Configurable `grace_fine_mode`: `'incremental'` (default, charges days after grace) vs `'retroactive'` (charges all days from due date). | `PRD.md` Sec 3.1, `DATA_MODEL.md` Sec 3.9 |
| **12** | India Localization | INR currency locked on 1st voucher, Asia/Kolkata timezone, DD/MM/YYYY dates, `en-IN` numbering, April start, CBSE/State presets (33% pass mark), RTE waiver, optional encrypted Aadhaar, TRAI DLT SMS templates, DPDP Act compliance. | `PRD.md` Sec 1.2, `DATA_MODEL.md` Sec 3.22 |
| **13** | Pass Mark Hierarchy | Wizard prompts pass mark. Presets suggest 33% for CBSE/State. Hierarchy: school $\to$ class $\to$ subject (lower levels inherit when NULL). | `PRD.md` Sec 3.5, `DATA_MODEL.md` Sec 3.2 |
| **14** | Mid-Month Admission | School setting `mid_month_admission_rule`: `'full_month'` (default), `'half_after_cutoff_day'` (default day 15), or `'daily_prorata'`. | `PRD.md` Module 7.4, `DATA_MODEL.md` Sec 3.22 |
| **15** | Calendar Due Day | Default calendar due day is 10th of each month, configurable per fee structure via `fee_structures.due_day_of_month`. | `PRD.md` Sec 3.1, `DATA_MODEL.md` Sec 3.9 |
| **16** | Absence Alerts | Sent 10 minutes after teacher marks attendance. If unmarked by 09:30 cutoff, alerts teacher/admin; never alerts parents. Push first, DLT SMS fallback. | `PRD.md` Module 4.3, `DATA_MODEL.md` Sec 3.22 |
| **17** | Working Days | Configured via `school_settings.week_pattern` (default Mon–Sat) plus institutional holiday calendar. Attendance uses real working days. | `PRD.md` Module 4.3, `DATA_MODEL.md` Sec 3.22 |
| **18** | Grading Presets | Standard 4.0 GPA, Percentage Only, and CBSE Style ("to be copied from pilot school report card"). All tiers fully editable. | `PRD.md` Sec 3.5, `DATA_MODEL.md` Sec 3.8 |
| **19** | Currency Locking | Pre-selected as `INR`, permanently locked upon insertion of first voucher or ledger entry. Worked examples strictly in rupees and paise. | `PRD.md` Sec 1.2, `DATA_MODEL.md` Sec 3.1 |
| **20** | Promotion Floor | Cumulative minimum attendance percentage required for standard annual promotion is `75.00%` (`promotion_attendance_threshold`). | `PRD.md` Sec 3.7, `DATA_MODEL.md` Sec 3.22 |
| **21** | Library Policy (P2) | Standard borrowing limits: 14 calendar days, max 3 books per student, overdue fine ₹1.00 (100 paise) per day. | `PRD.md` Module 12.3, `DATA_MODEL.md` Sec 3.14 |
| **22** | Hostel Curfew (P2) | Standard evening gate pass curfew cutoff time: 20:00 (8:00 PM) local school time (`hostel_curfew_time`). | `PRD.md` Module 15.3, `DATA_MODEL.md` Sec 3.17 |
| **23** | Retention Period | `retention_years` has no platform default. School onboarding wizard requires explicit selection, and onboarding cannot be completed without it (a lawyer or chartered accountant must confirm any suggested preset before one is added). Expired records anonymise PII while financial and academic records remain perpetual. | `PRD.md` Sec 1.2, `DATA_MODEL.md` Sec 3.1 & 3.22, `SCREENS.md` Screen 0.9 |

---

## 5. Task & Session Change Log

| Session / Step | Changes Implemented | Verified Artifacts |
| :---: | :--- | :--- |
| **Initial** | Monorepo root inspection, reference screenshot analysis (47 PNGs), authoring comprehensive implementation plan. | `plan_erp_documentation_suite.md` |
| **PRD** | Full authoring of `docs/PRD.md` across 23 modules, role user stories, worked mathematical examples, edge cases, acceptance criteria. | `docs/PRD.md` |
| **Data Model** | Authoring `docs/DATA_MODEL.md`: 113 tables, foreign keys, triggers, constraints, job queue, payment adapter models. | `docs/DATA_MODEL.md` |
| **Permissions** | Authoring `docs/PERMISSIONS.md`: 133 tokens, custom access token hook in `public`, private `app` schema helpers, pgTAP test suite. | `docs/PERMISSIONS.md` |
| **Screens** | Authoring `docs/SCREENS.md`: Module 0 through 23, 134 web routes, 37 mobile routes, component breakdowns, tri-state specifications. | `docs/SCREENS.md` |
| **Design System** | Authoring `docs/DESIGN_SYSTEM.md`: Slate neutrals + Indigo primary, exact HSL tokens, WCAG AA contrast table, coarse pointer touch targets, reconciled hotkeys, print engine. | `docs/DESIGN_SYSTEM.md` |
| **India Localization**| Updated PRD, Data Model, and Open Questions with CBSE/State presets, INR locking, TRAI DLT templates, DPDP Act 2023 compliance, bilingual typography. | `docs/PRD.md`, `docs/DATA_MODEL.md`, `docs/OPEN_QUESTIONS.md` |
| **Retention Policy** | Codified Decision 23: Mandatory explicit selection for `retention_years` during onboarding; no platform default; eliminated 7-year statutory benchmark claim across all docs. | `docs/OPEN_QUESTIONS.md`, `docs/DATA_MODEL.md`, `docs/PRD.md`, `docs/SCREENS.md` |
| **Progress Dashboard**| Authored comprehensive project roadmap, module tracking matrix, and DoD verification checklist. | `docs/PROGRESS.md` |
| **Monorepo Scaffolding** | Full monorepo scaffolding: Next.js 16, Expo SDK 57 (unified React 19), Turborepo, pnpm 12, Supabase CLI, 125-screen route manifest, full verification suite. | Monorepo root, `apps/*`, `packages/*`, `supabase/*`, `docs/ARCHITECTURE.md` |
