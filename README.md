# ERP — Multi-Tenant School Management Platform

Enterprise multi-tenant school management software-as-a-service (SaaS) platform built with Next.js App Router, Expo, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

---

## Prerequisites

Before setting up the project on Windows PowerShell 5.1, ensure the following are installed and running:

- **Node.js**: Version ≥ 24.0.0 ([Download Node.js](https://nodejs.org/))
- **pnpm**: Version ≥ 12.0.0 (`npm install -g pnpm`)
- **Docker Desktop**: Must be installed and running in the background for local Supabase services ([Download Docker Desktop](https://www.docker.com/products/docker-desktop/))
- **Git**: ([Download Git for Windows](https://git-scm.com/))

---

## Local Development Setup (Windows PowerShell 5.1)

Execute each command below individually in Windows PowerShell 5.1. **Run one command per line**:

Clone the repository:
```powershell
git clone <repository-url> ERP
```

Navigate into the project root:
```powershell
Set-Location ERP
```

Install monorepo dependencies:
```powershell
pnpm install
```

Copy the web environment template to a local configuration file:
```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Start the local Supabase stack (PostgreSQL, Auth, Storage, Studio):
> **Note**: The first time you execute this command, Docker will download several gigabytes of container images (PostgreSQL, GoTrue, PostgREST, Inbucket, Storage, Kong). Please allow sufficient time for the initial download to complete.
```powershell
pnpm db:start
```

Run PostgreSQL Row Level Security (RLS) tests to verify database integrity:
```powershell
pnpm test:rls
```

Generate TypeScript types from the local database:
```powershell
pnpm gen:types
```

Launch the Next.js web application development server:
```powershell
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Root Monorepo Scripts

All root commands use cross-platform syntax compatible with Windows PowerShell 5.1:

| Command | Description |
| :--- | :--- |
| `pnpm dev:web` | Start the Next.js App Router web client (`apps/web`) |
| `pnpm dev:mobile` | Start the Expo mobile application bundler (`apps/mobile`) |
| `pnpm lint` | Run ESLint across all workspaces and packages |
| `pnpm typecheck` | Run TypeScript type checks across all workspaces (`tsc --noEmit`) |
| `pnpm test` | Run Vitest unit tests across all packages |
| `pnpm test:rls` | Run pgTAP Row Level Security tests against local Supabase database |
| `pnpm test:e2e` | Run Playwright end-to-end tests for `apps/web` |
| `pnpm db:start` | Start local Supabase Docker containers |
| `pnpm db:reset` | Reset local database, reapplying all migrations and seed data |
| `pnpm db:migrate` | Apply pending local database migrations |
| `pnpm gen:types` | Generate TypeScript definitions from the local database schema |

---

## Workspace Structure

```
├── apps/
│   ├── web/        Next.js 16 App Router, Tailwind CSS v4, shadcn/ui
│   └── mobile/     Expo SDK 57, Expo Router, NativeWind v4, Tailwind CSS v3
├── packages/
│   ├── config/     Brand identity, public/server environment schemas, route manifest
│   ├── core/       Pure business logic layer (no DOM or React Native APIs)
│   ├── types/      Shared Zod schemas and database TypeScript types
│   └── ui/         Shared web UI component primitives (shadcn/ui style)
├── supabase/
│   ├── config.toml Supabase local configuration
│   ├── migrations/ SQL database migration files
│   ├── seed.sql    Deterministic local development seed data
│   └── tests/      pgTAP test files
└── docs/           Authoritative architectural specifications
```
