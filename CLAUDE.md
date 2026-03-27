# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server on port 3000 (0.0.0.0)
npm run build         # Production build
npm run build:force   # Build with 4GB heap (for memory-heavy builds)
npm run start         # Start production server on port 3001
npm run lint          # ESLint check
```

No test suite is configured. Manual testing is done via API routes under `/src/app/api/test-*` and admin tools at `/admin/ferramentas`.

## Architecture Overview

Multi-tenant SaaS platform for solar energy engineering project management (Colmeia Projetos / Goiás Solar). Built with **Next.js 14 App Router**, **Supabase (PostgreSQL)**, and **Supabase Auth**.

### Multi-Tenant System

Tenants are identified by subdomain (e.g., `goias-solar.gerenciamentofotovoltaico.com.br`). The middleware ([src/middleware.ts](src/middleware.ts)) intercepts all requests to:
1. Extract the subdomain and look up the tenant in the `tenants` table
2. Validate tenant status (`active`, `pending`, `suspended`, `canceled`)
3. Inject tenant context via HTTP headers: `x-tenant-id`, `x-tenant-slug`, `x-tenant-name`, `x-tenant-trial`

Client-side tenant resolution uses `getCurrentDomainTenantId()` from [src/lib/utils/tenant-client.ts](src/lib/utils/tenant-client.ts). All database queries must be filtered by `tenant_id`.

### Route Structure

- `/admin/*` — Admin/staff dashboard (project management, team, clients, billing, kanban, dimensioning)
- `/cliente/*` — Client-facing portal (view projects, invoices, notifications)
- `/api/*` — API routes, split into `/api/admin/` and `/api/cliente/`
- `/registro` — New tenant registration
- `/blog` — Technical documentation/blog

### Authentication

Supabase Auth with two separate login flows:
- Admin: `/admin/login` → session validated against `x-tenant-id`
- Client: `/cliente/login` → same but client role

Auth context: [src/lib/auth/client.tsx](src/lib/auth/client.tsx) (React provider)
Server-side helpers: [src/lib/auth/server.ts](src/lib/auth/server.ts)
Auth service: [src/lib/services/authService.supabase.ts](src/lib/services/authService.supabase.ts)

Role checking uses `useRole()` hook from [src/lib/hooks/useRole.ts](src/lib/hooks/useRole.ts). Roles include: `superadmin`, `admin`, `colaborador`, `owner`, `cliente`.

### Key Services (`src/lib/services/`)

Each major domain has a dedicated service file (e.g., `billingService.supabase.ts`, `clientService.supabase.ts`, `notificationService.ts`, `kanbanService.ts`). Services handle all database interactions and should be used instead of direct Supabase calls in components.

### Database

Supabase PostgreSQL. Migrations are in `/supabase/migrations/`. Utility SQL scripts for diagnostics are in `/scripts/`.

Supabase client initialization:
- Client-side: `createClient()` from `@supabase/ssr`
- Server-side (API routes/Server Actions): service role client from [src/lib/supabase/](src/lib/supabase/)

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
# Firebase (legacy storage still used)
NEXT_PUBLIC_FIREBASE_*
FIREBASE_*
# Email
AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / EMAIL_FROM
# Billing
STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### TypeScript

Path alias `@/*` maps to `./src/*`. Strict mode is off. Types are in `/src/types/`.

### UI Stack

Tailwind CSS + Radix UI primitives + shadcn/ui components in [src/components/ui/](src/components/ui/). Admin and client components are separated under [src/components/admin/](src/components/admin/) and [src/components/client/](src/components/client/).
