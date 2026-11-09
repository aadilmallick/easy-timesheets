# Architecture & Core Concepts

This document provides a comprehensive overview of the application architecture, runtime design, component boundaries, data flow, and environment configurations for **Easy Timesheets**.

---

## 1. Architectural Principles

Easy Timesheets follows modern Next.js 16 App Router best practices:

1. **Server Components by Default**:
   - Layouts and route `page.tsx` files are React Server Components (RSC).
   - Server components handle database queries directly through `CloudDatabase`, extract auth sessions via Clerk (`auth()`, `currentUser()`), and pass clean serialized data down to client components.
2. **Client Components for Interactivity**:
   - Client components are marked with `"use client"` and strictly scoped to interactive leaf nodes (dialogs, tables with transitions, toast feedback, tab switching).
   - State mutation is executed through Next.js Server Actions with React's `useTransition` to handle pending states and trigger UI revalidations seamlessly.
3. **Database Abstraction Layer**:
   - All direct SQL queries are encapsulated inside `CloudDatabase` (`db/CloudDatabase.ts`).
   - Route handlers and server actions do not write raw SQL strings, ensuring clean separation of concerns and parameterized safety.
4. **Declarative Validation**:
   - Server Actions use **Zod** to validate every input field, coercion, and format requirement before touching the database.

---

## 2. Request & Data Flow Architecture

The following diagram illustrates how user requests move through the system:

```
[Browser Client]
       │
       ▼
[Edge / Node Runtime: proxy.ts (Clerk Middleware)]
       │ (Blocks unauthenticated access to protected routes)
       ├─────────────────────────────────┐
       ▼ (Public Routes)                 ▼ (Protected Routes)
[/, /sign-in, /sign-up]           [/dashboard, /timesheets/*, /review/*]
       │                                 │
       ▼                                 ▼
[RSC Page Components] ─────────────► [Clerk Server auth() & currentUser()]
       │                                 │
       │ (Fetch Data)                    ▼
       └───────────────────────────► [CloudDatabase (Neon SQL Client)]
                                         │
                                         ▼
                                   [Neon PostgreSQL DB]
                                         │
       ┌─────────────────────────────────┘
       ▼
[Interactive Client Components]
(DashboardTabs, TimesheetDetail, ReviewDetail, Dialogs)
       │
       │ (User actions: Submit, Create, Edit, Approve, Reject)
       ▼
[Server Actions: app/actions/timesheets.ts]
       ├─► 1. Auth check (Clerk auth())
       ├─► 2. Upsert user / link supervisor
       ├─► 3. Zod schema validation
       ├─► 4. Business logic & date boundary validation
       ├─► 5. Execute DB query (CloudDatabase)
       ├─► 6. Trigger Resend Email (if submission)
       └─► 7. revalidatePath() & return status
```

---

## 3. Server vs. Client Component Boundaries

To maintain minimal bundle sizes and fast time-to-interactive, components are clearly segregated:

### Server Components (RSC)
| Path | Role | Data Sources |
| :--- | :--- | :--- |
| `app/layout.tsx` | Global layout shell, `<ClerkProvider>`, navigation header | Clerk auth state |
| `app/page.tsx` | Landing page, redirects signed-in users to `/dashboard` | Clerk `auth()` |
| `app/dashboard/page.tsx` | Dashboard view, loads user's timesheets & assigned timesheets | `CloudDatabase.getMyTimesheets()`, `CloudDatabase.getAssignedTimesheets()` |
| `app/timesheets/[id]/page.tsx` | Timesheet detail loader, permission check (employee only) | `CloudDatabase.getTimesheetById()`, `CloudDatabase.getEntriesForTimesheet()` |
| `app/review/[id]/page.tsx` | Supervisor review page, supervisor auth verification | `CloudDatabase.getTimesheetById()`, `CloudDatabase.getEntriesForTimesheet()` |
| `app/timesheets/share/[id]/page.tsx` | Authenticated supervisor view via shared link | `CloudDatabase.getTimesheetById()`, auto-linking supervisor email |
| `app/timesheets/preview/[token]/page.tsx` | Public preview page with HMAC verification | `getTimesheetIdFromShareToken()`, `CloudDatabase.getTimesheetById()` |

### Client Components (`"use client"`)
| Path | Responsibilities | Key Hooks & APIs |
| :--- | :--- | :--- |
| `app/dashboard/DashboardTabs.tsx` | Tabbed switching between "My Timesheets" & "Assigned To Me", Delete dialogs | `useTransition`, `sonner`, `deleteTimesheet`, `submitTimesheet` |
| `app/dashboard/CreateTimesheetDialog.tsx` | Modal form to create a timesheet period | `useState`, `useTransition`, `createTimesheet` action |
| `app/timesheets/[id]/TimesheetDetail.tsx` | Entry table, Add Entry dialog, Edit dialog, Share button, Test Email | `useState`, `useTransition`, `navigator.clipboard`, `sonner` |
| `app/review/[id]/ReviewDetail.tsx` | Supervisor entry review table with approve/reject buttons | `useTransition`, `approveEntry`, `rejectEntry` actions |
| `app/timesheets/share/[id]/SharedTimesheetDetail.tsx` | One-click supervisor timesheet approval | `useTransition`, `approveSharedTimesheet` action |

---

## 4. Routing & Middleware Architecture

Route handling is configured with Clerk in `proxy.ts`:

- **Public Routes**:
  - `/` (Home landing page)
  - `/sign-in(.*)` (Clerk sign-in catch-all)
  - `/sign-up(.*)` (Clerk sign-up catch-all)
  - `/timesheets/preview/[token]` (Token-authenticated preview with HMAC signature)
- **Protected Routes**:
  - All other routes (`/dashboard`, `/timesheets/[id]`, `/review/[id]`, `/timesheets/share/[id]`, Server Actions) automatically require an active Clerk session via `auth.protect()`.

---

## 5. Environment Variables & Runtime Configuration

Runtime settings are verified via `utils/constants.ts` and standard environment variables:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Server | PostgreSQL connection string for Neon serverless driver (`postgres://...`). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public / Browser | Clerk frontend publishable key for user session initialization. |
| `CLERK_SECRET_KEY` | Server | Clerk backend secret key used for verifying sessions and user data. |
| `RESEND_API_KEY` | Server | API key for Resend email delivery. |
| `NEXT_PUBLIC_APP_URL` | Server / Browser | Base application URL (e.g. `http://localhost:3000` or production domain) used in emails & metadata. |
| `TIMESHEET_SHARE_SECRET` | Server (Optional) | Secret key for signing HMAC share tokens. Falls back to `CLERK_SECRET_KEY` or `DATABASE_URL`. |
| `NODE_ENV` | Build / Runtime | Environment mode (`development`, `production`, `test`). |

---

## 6. Performance & Build Considerations

- **Static Generation with Database Connections**: When executing Next.js builds (`npm run build`), page generation evaluates route files. Always provide a valid or mock `DATABASE_URL` (e.g., `DATABASE_URL=postgres://dummy:dummy@dummy/dummy npm run build`) in CI/CD environments.
- **Neon Serverless Driver**: Queries run over HTTPS/WebSockets without requiring persistent socket pools, which makes it well-suited for serverless deployments on platforms like Vercel.
- **Type Casting in Neon SQL**: Tagged template literals must include explicit PostgreSQL casts (e.g., `::text`, `::uuid`, `::date`) when parameter values may be `null` in expressions like `COALESCE` or `CASE WHEN`.
