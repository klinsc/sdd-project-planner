# SDD Project Planner

Multi-project Gantt management boilerplate built with Next.js 14 App Router, TypeScript, TailwindCSS + shadcn/ui, Prisma, and PostgreSQL. It ships with RBAC (Admin, Manager, Member, Viewer), project/task/milestone/issue APIs, and extensible UI ready for realtime hooks.

## Requirements

- Node.js >= 18.17
- PostgreSQL 14+
- pnpm/npm/yarn (examples use npm)

## Environment Variables

Create `.env` with:

```
DATABASE_URL="postgresql://user:password@localhost:5432/sdd_planner"
NEXTAUTH_SECRET="REPLACE_ME"
NEXTAUTH_URL="http://localhost:3000"
```

`getCurrentUser()` temporarily reads the `x-user-id` cookie in development. Set this cookie to a seeded user ID (e.g., admin) when testing without NextAuth. Replace the stub with `getServerSession` once you configure providers.

## Setup

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Prisma Studio can be opened with `npx prisma studio`.

## Database Seeding

The seed script creates:

- Admin (`admin@example.com`)
- Project manager (`pm@example.com`)
- Member (`member@example.com`)
- Sample project with tasks, milestones, and an issue

Re-run via `npm run db:seed` (the script truncates related tables first).

## RBAC Summary

| Role    | Capabilities                                                          |
| ------- | --------------------------------------------------------------------- |
| Admin   | Global project creation, member management, task/issue/milestone CRUD |
| Manager | Project-scoped member + task/milestone CRUD                           |
| Member  | Create/update tasks assigned to them, log issues                      |
| Viewer  | Read-only access                                                      |

Project membership enforces per-project permissions; global Admin overrides.

## API Surface (App Router)

- `POST /api/projects` (Admin only) — create project
- `GET /api/projects` — list projects for current user
- `GET/PATCH/DELETE /api/projects/:projectId`
- `GET/POST/DELETE /api/projects/:projectId/members`
- `GET/POST /api/tasks`
- `GET/PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/milestones`
- `PATCH/DELETE /api/milestones/:id`
- `GET/POST /api/issues`
- `PATCH/DELETE /api/issues/:id`

All routes use Zod validation, status codes, and permission helpers.

## Manual Testing (curl)

```bash
# List projects
curl -H "Cookie: x-user-id=<admin-id>" http://localhost:3000/api/projects

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Cookie: x-user-id=<admin-id>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Beta Launch","description":"Go-live prep","startDate":"2025-02-01","endDateTarget":"2025-05-31"}'

# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Cookie: x-user-id=<manager-id>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","title":"Design","startDate":"2025-02-03","endDateOriginal":"2025-02-21","delayDays":0,"progress":0}'

# Add issue/delay
curl -X POST http://localhost:3000/api/issues \
  -H "Cookie: x-user-id=<member-id>" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"<task-id>","title":"Vendor outage","startDate":"2025-02-10","durationDays":3}'
```

## Realtime Hooks

Hooks for WebSocket/Supabase/Pusher are marked with `TODO` comments in:

- `components/Gantt.tsx` (timeline refresh)
- `components/TaskEditorModal.tsx`
- `components/MilestoneEditor.tsx`
- `components/MemberManager.tsx`
- `app/api/issues/route.ts` (issue creation audit)

Attach your preferred realtime transport there.

## Development Notes

- Tailwind + shadcn/ui primitives live under `components/ui/*`.
- `ProjectContext` shares metadata between client components (Gantt, modals).
- Permission guard ensures client tools only show for authorized roles.
- `lib/taskDates.ts` centralizes final date calculations and is reused by tasks/issues routes.
- Update `getCurrentUser()` once NextAuth is configured; route file already includes a placeholder handler.

## Test Plan

1. Seed database and start dev server.
2. Set `x-user-id` cookie (admin) and open `/dashboard`.
3. Create a project, then open its dashboard and Gantt view.
4. Use the task modal to create a task; verify API response and Gantt bar.
5. Add an issue via the issue API (or manually via Prisma Studio) and confirm the task end date shifts.
6. Change a member role through `MemberManager`; check AuditLog entries via Prisma Studio.
7. Hit the curl commands above to ensure APIs enforce RBAC (try with viewer `x-user-id` to see 403s).

The project is now ready for deployment, further feature work, and realtime wiring.
