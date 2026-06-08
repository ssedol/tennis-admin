@AGENTS.md

# Tennis Admin — Codebase Guide

## Project Overview

Tennis club management web app (테니스장 관리 웹앱) for Korean tennis facilities. Three user roles share one app:

- **OWNER** — Club owner: views all lesson schedules across coaches, manages members/courts/settings, sees audit history
- **COACH** — Tennis coach: manages daily lesson schedule, writes text feedback, reviews uploaded videos with timestamp comments
- **MEMBER** — Tennis student: views own lessons, uploads practice videos, reads coach feedback, logs activity

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js **16.2.6** + TypeScript | App Router, React 19.2.4 |
| Styling | Tailwind CSS **4** + shadcn/ui | Dark theme, inline `@theme` in globals.css |
| BaaS | Supabase | Auth + PostgreSQL + Storage |
| DB Client | @supabase/ssr 0.10.3 | Cookie-based sessions for App Router |
| Icons | lucide-react | Always paired with text labels |
| Deployment | Docker (standalone output) | Port **8899** |

**CRITICAL — Next.js 16:** This version has breaking changes from versions in training data. Read `node_modules/next/dist/docs/` before writing any Next.js code. React 19 also has breaking changes. Heed all deprecation notices.

## Directory Structure

```
tennis-admin/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Public routes (no auth required)
│   │   │   ├── login/                 # Email/password login + dev role switcher
│   │   │   ├── auth/callback/         # Supabase OAuth/magic-link callback
│   │   │   └── change-password/       # Forced password change on first login
│   │   ├── (app)/                     # Protected routes (require auth)
│   │   │   ├── layout.tsx             # Auth guard wrapper
│   │   │   ├── owner/                 # OWNER role
│   │   │   │   ├── page.tsx           # Dashboard (today/weekly/monthly/yearly tabs)
│   │   │   │   ├── members/           # Member management
│   │   │   │   ├── courts/            # Court management
│   │   │   │   ├── settings/          # Organization settings
│   │   │   │   ├── history/           # Lesson audit log
│   │   │   │   └── lessons/[id]/      # Lesson detail
│   │   │   ├── coach/                 # COACH role
│   │   │   │   ├── page.tsx           # Today's lessons
│   │   │   │   └── lessons/[id]/      # Lesson detail + text feedback
│   │   │   └── member/                # MEMBER role
│   │   │       ├── page.tsx           # My lessons list
│   │   │       └── lessons/[id]/      # Lesson detail + video upload + feedback
│   │   └── api/                       # Route handlers
│   │       ├── auth/login/            # Email/password login
│   │       ├── auth/dev/login/        # Dev-mode quick login
│   │       ├── lessons/               # CRUD + feedbacks, video, history
│   │       ├── members/               # List, create (invite), detail
│   │       ├── courts/                # CRUD
│   │       ├── court-reservations/    # CRUD
│   │       └── member/logs/           # Tennis activity log
│   ├── components/
│   │   ├── ui/                        # shadcn/ui base components
│   │   ├── owner/                     # Owner-specific components
│   │   ├── coach/                     # Coach-specific components
│   │   ├── member/                    # Member-specific components
│   │   ├── layout/                    # Shared layout (LogoutButton)
│   │   └── dev/                       # Dev-only (DevRoleSwitcher)
│   ├── lib/
│   │   ├── supabase/                  # client.ts, server.ts, env.ts
│   │   ├── lesson-recurrence.ts       # Recurring lesson date generation (max 200)
│   │   ├── lesson-access.ts           # Access control checks by role
│   │   ├── lesson-conflict.ts         # Slot overlap detection before create
│   │   ├── lesson-delete.ts           # Delete logic (soft/hard)
│   │   ├── lesson-history.ts          # Audit history retrieval
│   │   ├── lesson-stats.ts            # Stats calculation and filtering
│   │   ├── owner-schedule-groups.ts   # Dashboard grouping by date/week/month/court
│   │   ├── time-slots.ts              # 20-min slot utilities (UTC-based)
│   │   ├── dev-auth.ts                # Dev test accounts and cookie constants
│   │   └── utils.ts                   # cn() = clsx + tailwind-merge
│   ├── types/
│   │   └── database.ts                # Manually maintained Supabase types
│   └── proxy.ts                       # Custom Next.js middleware (auth + role redirects)
├── supabase/
│   └── migrations/                    # 6 numbered SQL files (never edit existing ones)
├── MD/                                # Project docs (ARCHITECTURE.md, PRD.md, etc.)
├── Dockerfile                         # Multi-stage: dev + prod targets
├── docker-compose.yml                 # Profiles: default=dev, prod=production
├── env.docker.example                 # Environment variable template
├── next.config.ts                     # standalone output, NEXT_PUBLIC_* hardcoded at build
├── components.json                    # shadcn/ui config (style: base-nova, tw4)
└── postcss.config.mjs                 # Tailwind CSS 4 PostCSS plugin only
```

## Development Workflow

### Local Dev

```bash
npm run dev          # http://localhost:8899
npm run lint         # ESLint 9 check
npm run build        # production build
```

No test suite exists in this project.

### Docker

```bash
npm run docker:dev   # dev with hot reload (volume mounts)
npm run docker:prod  # production standalone build
```

### Environment Variables

Copy `env.docker.example` to `.env.local` (local) or `env.docker` (Docker):

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>
SUPABASE_SERVICE_ROLE_KEY=<service role JWT>
SKIP_MUST_CHANGE_PASSWORD=true   # dev only: skip forced password change
```

`next.config.ts` hardcodes `NEXT_PUBLIC_*` at build time for Docker standalone output — these must be present at build, not just at runtime.

## Authentication

### Production Flow

1. User submits email/password at `/login`
2. `POST /api/auth/login` → Supabase email/password sign-in
3. Session stored in cookies via `@supabase/ssr`
4. Role read from `profiles.role` → redirect to `/owner`, `/coach`, or `/member`
5. First-login forced password change (skippable via `SKIP_MUST_CHANGE_PASSWORD=true`)

### Dev Mode Fast Login

In `NODE_ENV=development`, `DevRoleSwitcher` appears on the login page. Clicking a role:
1. Calls `POST /api/auth/dev/login` → sets cookie `x-dev-role=OWNER|COACH|MEMBER`
2. `proxy.ts` reads this cookie and **bypasses Supabase auth entirely**

Dev test accounts in Supabase (password `1234`):
- OWNER: `owner@tennis.test`
- COACH: `coach01@test.com`
- MEMBER: `member01@test.com`

### Middleware — `src/proxy.ts`

**Not** named `middleware.ts`. Exports `proxy()` function. Handles:
- Dev role cookie bypass (`x-dev-role`)
- Supabase session validation via `supabase.auth.getUser()`
- Redirecting unauthenticated users → `/login`
- Redirecting authenticated users away from `/login` → role dashboard

Public paths: `/login`, `/auth`, `/api`, `/change-password`

## Database

### No ORM

Raw Supabase PostgreSQL client calls — no Drizzle, no Prisma. All queries use `supabase.from(...)` methods.

### Key Tables

| Table | Purpose |
|---|---|
| `organizations` | Tennis club record |
| `profiles` | User profile; `id` FK → `auth.users`; has `role` and `organization_id` |
| `lesson_schedules` | Lesson bookings (coach, member, court, status, `scheduled_at` UTC) |
| `lesson_schedule_history` | Audit log for lesson CREATED / DELETED events |
| `lesson_feedbacks` | Text feedback entries; has `author_id` (coach) |
| `courts` | Court records (type, surface, active, sort_order) |
| `court_reservations` | Non-lesson blocks (CLUB, EXTERNAL, BLOCK) |
| `videos` | Video metadata with Supabase Storage `storage_path` |
| `video_comments` | Timestamp-based comments on videos (`timestamp_sec`) |
| `tennis_logs` | Member activity log (LESSON / PRACTICE / MATCH) |
| `notifications` | Notification inbox per user |

### Enums

```sql
user_role:          OWNER | COACH | MEMBER
lesson_status:      SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
court_type:         INDOOR | OUTDOOR
court_surface:      HARD | CLAY | GRASS | ARTIFICIAL_TURF
reservation_type:   LESSON | CLUB | EXTERNAL | BLOCK
log_type:           LESSON | PRACTICE | MATCH
notification_type:  LESSON_REMINDER | VIDEO_UPLOADED | FEEDBACK_ADDED
```

### Row-Level Security

All tables have RLS enabled. Role hierarchy: OWNER > COACH > MEMBER. Policies restrict data to same-organization users. To bypass RLS (admin aggregation), use the service role client — never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### Supabase Clients

```typescript
// Browser client (Client Components only)
import { createClient } from '@/lib/supabase/client'

// Server client with cookie session (Server Components, Route Handlers)
import { createClient } from '@/lib/supabase/server'

// Admin / bypass RLS: createClient(url, serviceRoleKey) — server-side only
```

### Migrations

Add new numbered files to `supabase/migrations/`. **Never edit existing migrations.** Current migrations:
1. `001_initial_schema.sql` — core tables and RLS
2. `002_courts.sql` — court management
3. `003_lesson_feedback_author.sql` — `author_id` on feedbacks
4. `004_lesson_videos_storage.sql` — storage bucket setup
5. `005_lesson_schedule_history.sql` — audit table
6. `006_lesson_created_by.sql` — lesson creator tracking

### Types

`src/types/database.ts` is **manually maintained** (not auto-generated from Supabase CLI). Update it when adding new columns or tables.

## Styling & Design System

### Tailwind CSS 4 — No Config File

Uses `@import "tailwindcss"` and `@theme { ... }` directive inline in `src/app/globals.css`. There is **no `tailwind.config.ts`**. Custom utilities and tokens are declared in that file.

### Color Palette (Dark Theme Only)

| Role | Value | CSS Variable | Usage |
|---|---|---|---|
| Background | `#0a0a0a` | `--background` | Page background |
| Surface / Card | `#141414` | `--card` | Card and panel backgrounds |
| Border | `#222222` | `--border` | Card borders, dividers |
| Text Primary | `#ffffff` | `--foreground` | Headings, main content |
| Text Secondary | `#888888` | `--muted-foreground` | Labels, timestamps, meta |
| **Volta (accent)** | `#c8f000` | `--volta` | CTA buttons, badges — **≤3 uses per page** |
| Danger | `#ff4444` | `--destructive` | Errors, cancel/delete actions |

Volta utility classes: `text-volta`, `bg-volta`, `bg-volta-muted`, `border-volta`, `ring-volta`

### Card Pattern

All list items and content panels follow this pattern:

```tsx
<div className="bg-[#141414] border border-[#222222] rounded-xl p-4
                hover:border-[#333333] transition-colors duration-150">
```

### Buttons

- **Primary (Volta):** `bg-volta text-black font-semibold` — one per page, main CTA only
- **Secondary:** `bg-[#1e1e1e] text-white border border-[#333]`
- **Ghost:** `text-muted-foreground hover:text-white`

### Typography

- Font: Geist Sans (Next.js default)
- Headings: `font-semibold text-lg` or larger
- Body: `font-normal text-sm` to `text-base`
- Metadata: `text-xs text-muted-foreground`

### shadcn/ui

Components live in `src/components/ui/`. Add new ones with:

```bash
npx shadcn add <component>
```

Config: `components.json` — style `base-nova`, Tailwind CSS 4, RSC enabled, icon library `lucide`.

### Layout Principles

- **Mobile-first** (375px base) — coaches and members primarily use mobile
- Generous whitespace — avoid cramped layouts
- Animations: `duration-150` max, keep minimal
- Icons: always pair `lucide-react` icons with a text label

## Time & Scheduling

- **Slot size:** 20-minute increments (`SLOT_MINUTES = 20` in `time-slots.ts`)
- **DB storage:** UTC ISO strings — `scheduled_at` is always UTC
- **Display:** Korea timezone conversion handled in `time-slots.ts` utilities
- Key functions: `utcIsoToSlotIndex()`, `dateSlotToUtcIso()`, `slotRangeToUtcIso()`

## API Route Conventions

Each route handler validates auth independently (no centralized API middleware):

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  // role check: profile.role === 'OWNER' etc.
}
```

- Role authorization: read `profiles.role` from DB — do not trust client-supplied role claims
- Use service role client only when explicitly bypassing RLS for admin aggregation

## Component Conventions

- **Server Components** by default — pages fetch data server-side and pass it down
- **Client Components** (`"use client"`) only for interactive UI (forms, state, event handlers)
- Role-specific client components named `{Name}Client.tsx` (e.g., `CoachClient.tsx`, `OwnerDashboard.tsx`)
- Role directories: `src/components/owner/`, `src/components/coach/`, `src/components/member/`

## Video Storage

- Bucket: `lesson-videos` in Supabase Storage
- Max size: 100 MB per file
- Upload: `POST /api/lessons/[id]/video/upload`
- Metadata: `videos` table with `storage_path` reference
- Timestamp comments: `video_comments` table with `timestamp_sec` (integer seconds)

## Key Gotchas

| Gotcha | Detail |
|---|---|
| Port | Dev and production both run on **8899**, not 3000 |
| Middleware name | Auth middleware is `src/proxy.ts` (exports `proxy()`), not `middleware.ts` |
| No Tailwind config | Theme tokens live in `globals.css` `@theme` block |
| Types are manual | `src/types/database.ts` must be updated manually after schema changes |
| Build-time env | `NEXT_PUBLIC_*` vars must be available at `next build` time, not just runtime |
| Dev role bypass | `x-dev-role` cookie entirely bypasses Supabase in `NODE_ENV=development` |
| Korean strings | All user-facing text and most code comments are in Korean |
| No test suite | No unit or integration tests exist; verify behavior manually |
| Conflict check | Always call `lesson-conflict.ts` before inserting new `lesson_schedules` rows |
| Recurring cap | `lesson-recurrence.ts` caps recurring lesson generation at 200 dates |
