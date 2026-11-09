# Easy Timesheets Codebase Documentation

Welcome to the **Easy Timesheets** codebase documentation. This document acts as the central entrypoint for human developers and AI agents to quickly understand the entire architecture, domain models, database schema, frontend components, server actions, authentication flow, and development workflows.

---

## 1. Executive Summary

**Easy Timesheets** is a full-stack Next.js application designed to streamline employee timesheet submissions and supervisor approvals. It eliminates spreadsheet overhead by allowing employees to create timesheet periods, log hours per day with descriptions, and submit them directly to supervisors for approval.

### Key Highlights
- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript.
- **Styling & UI**: Tailwind CSS v4, shadcn/ui primitives, Lucide React icons, and Sonner notifications.
- **Database & Data Access**: Neon serverless PostgreSQL managed through the `CloudDatabase` abstraction class (`db/CloudDatabase.ts`) using parameterized SQL queries.
- **Authentication**: Clerk (`@clerk/nextjs`), handling sign-in, sign-up, user profiles, and session validation.
- **Email Delivery**: Resend (`resend`) for sending submission notifications to designated supervisors.
- **Secure Sharing**: HMAC-SHA256 signed tokens for public preview links allowing supervisors to jump into review flows.

---

## 2. Documentation Map

Explore individual subsystem documentation using the links below:

| Document | Focus & Contents |
| :--- | :--- |
| **[Architecture & Core Concepts](architecture.md)** | Application architecture, Server vs. Client component boundaries, App Router routing layout, data flow patterns, and environment configuration. |
| **[Database & SQL Schema](database.md)** | PostgreSQL schema definitions (`db/schema.sql`), Neon serverless integration, table schemas, indexes, enums, migrations, and the `CloudDatabase` API reference. |
| **[Components & Pages](components.md)** | Page routes (`/`, `/dashboard`, `/timesheets/[id]`, `/review/[id]`, `/timesheets/preview/[token]`, `/timesheets/share/[id]`), client dialogs/forms, and shadcn/ui components. |
| **[Actions & Workflows](actions-and-workflows.md)** | Next.js Server Actions (`app/actions/timesheets.ts`), Zod validation schemas, business rules, timesheet status lifecycles, and auto-recalculation logic. |
| **[Authentication & Security](auth-and-security.md)** | Clerk authentication flow, route protection middleware (`proxy.ts`), user upserting/email normalization, and cryptographic share token signing. |
| **[Email Notifications](email-notifications.md)** | Resend service setup, transactional email templates, email normalization, automatic supervisor linking, and dev testing utilities. |
| **[Skills: Doc Updater](skills/doc-updater.md)** | Guide and process for AI agents to audit and maintain `DOCS/` up to date as code evolves. |
| **[Skills: Bug & UI/UX Flaw Finder](skills/bug-and-ui-flaw-finder.md)** | Systematic auditing skill for identifying functional bugs, edge-case failures, visual flaws, and UX friction points with actionable fixes. |

---

## 3. Directory Layout

The project follows a standard Next.js App Router structure:

```
├── .claude/                   # Claude agent configuration and hooks
├── AGENTS.md                  # Operational directives and rules for AI agents
├── CLAUDE.md                  # Project-specific commands and conventions
├── DOCS/                      # Central codebase documentation & AI skill guides
│   ├── codebase.md            # Entrypoint (this file)
│   ├── architecture.md        # Architectural patterns & runtime model
│   ├── database.md            # Postgres schema, queries, CloudDatabase class
│   ├── components.md          # UI components & App Router page breakdown
│   ├── actions-and-workflows.md # Server Actions, Zod schemas, lifecycles
│   ├── auth-and-security.md   # Clerk auth, middleware, HMAC signatures
│   ├── email-notifications.md # Resend email delivery & supervisor linking
│   └── skills/                # Agent operational skills
│       ├── doc-updater.md
│       └── bug-and-ui-flaw-finder.md
├── app/                       # App Router routes and server actions
│   ├── actions/               # Server actions (timesheets CRUD, review, share)
│   ├── dashboard/             # Dashboard page, tabs, create dialog
│   ├── review/                # Supervisor review pages & actions
│   ├── sign-in/               # Clerk sign-in catch-all route
│   ├── sign-up/               # Clerk sign-up catch-all route
│   ├── timesheets/            # Timesheet details, share, preview pages
│   ├── globals.css            # Tailwind CSS styling and theme tokens
│   ├── icon.svg               # App favicon
│   └── layout.tsx             # Root layout with ClerkProvider, header, Toaster
├── components/                # React UI components
│   └── ui/                    # shadcn/ui primitives (button, dialog, table, etc.)
├── db/                        # Database connectivity and migrations
│   ├── CloudDatabase.ts       # Central data access class with parameterized SQL
│   ├── migrate.ts             # Migration execution script
│   └── schema.sql             # PostgreSQL schema definition
├── lib/                       # Shared utility libraries
│   ├── date.ts                # Date formatting, normalization, and range checks
│   ├── email-address.ts       # Email normalization and equality helpers
│   ├── email.ts               # Resend client & transactional email templates
│   ├── timesheet-share.ts     # HMAC token generation and verification
│   └── utils.ts               # Tailwind CSS `cn()` class merger
├── llm_docs/                  # Product Requirements Document & Clerk reference
│   ├── PRD.md                 # Original product requirements document
│   └── clerk_guide.md         # Clerk setup guide
├── public/                    # Static assets (SVGs, icons)
├── utils/                     # Environment validation utilities
│   └── constants.ts           # Environment variable validation & mapping
├── components.json            # shadcn/ui configuration
├── eslint.config.mjs          # ESLint 9 configuration
├── next.config.ts             # Next.js runtime configuration
├── package.json               # Package dependencies & npm scripts
├── postcss.config.mjs         # PostCSS configuration
├── proxy.ts                   # Clerk middleware for route authentication
└── tsconfig.json              # TypeScript configuration
```

---

## 4. Technology Stack & Key Dependencies

| Technology | Purpose | Notes |
| :--- | :--- | :--- |
| **Next.js 16.2.2** | Full-Stack Web Framework | App Router, Server Actions, Server Components, Streaming SSR. |
| **React 19.2.4** | UI Library | Hooks (`useTransition`, `useState`), Server/Client boundary separation. |
| **TypeScript 5** | Language | Strict typing, full schema sync between database models and frontend. |
| **Tailwind CSS v4** | CSS Framework | Modern CSS styling with PostCSS plugin and CSS custom properties. |
| **shadcn/ui** | Component System | Accessible primitives built on top of Radix/Base UI components. |
| **@neondatabase/serverless** | PostgreSQL Client | Lightweight SQL driver executing queries over HTTP/WebSockets to Neon DB. |
| **@clerk/nextjs 7.0.8** | Authentication | User sessions, authentication middleware, `<SignInButton>`, `<UserButton>`. |
| **Zod 4.3.6** | Data Validation | Form validation and Server Action argument parsing. |
| **Resend 6.10.0** | Email Delivery | Transactional emails for timesheet submission notices. |
| **Sonner 2.0.7** | Toast Notifications | User-facing action feedback (success/error popups). |

---

## 5. Core Domain Entities & Relationships

```
+-------------------------------------------------------+
|                        users                          |
|-------------------------------------------------------|
| id: UUID (PK)                                         |
| clerk_user_id: TEXT (UNIQUE)                          |
| email: TEXT (UNIQUE, lower-case index)                |
| name: TEXT NULL                                       |
| created_at: TIMESTAMPTZ                               |
+-------------------------------------------------------+
         | 1                                  | 1
         | employee                           | supervisor (nullable)
         v N                                  v N
+-------------------------------------------------------+
|                      timesheets                       |
|-------------------------------------------------------|
| id: UUID (PK)                                         |
| title: TEXT                                           |
| employee_user_id: UUID (FK -> users.id)               |
| employee_email: TEXT                                  |
| supervisor_user_id: UUID NULL (FK -> users.id)        |
| supervisor_email: TEXT                                |
| start_date: DATE                                      |
| end_date: DATE                                        |
| status: timesheet_status (draft|submitted|approved|..) |
| created_at: TIMESTAMPTZ                               |
| updated_at: TIMESTAMPTZ                               |
| submitted_at: TIMESTAMPTZ NULL                        |
+-------------------------------------------------------+
         | 1
         |
         v N (ON DELETE CASCADE)
+-------------------------------------------------------+
|                  timesheet_entries                    |
|-------------------------------------------------------|
| id: UUID (PK)                                         |
| timesheet_id: UUID (FK -> timesheets.id)              |
| date: DATE                                            |
| hours: DECIMAL(5,2) (0.5 to 24.00)                    |
| description: TEXT NULL                                |
| approval_status: entry_status (pending|approved|rej.) |
| created_at: TIMESTAMPTZ                               |
| updated_at: TIMESTAMPTZ                               |
+-------------------------------------------------------+
```

---

## 6. Primary User Flows

### A. Employee Flow
1. **Sign In**: User signs in with Clerk; `CloudDatabase.upsertUser` records or updates the user record in PostgreSQL.
2. **Dashboard**: Navigate to `/dashboard` to view timesheets created by the user ("My Timesheets" tab) or assigned to them ("Assigned To Me" tab).
3. **Create Timesheet**: Click "New Timesheet", enter title, date range, and supervisor email. Status initializes as `draft`.
4. **Log Hours**: Open timesheet detail at `/timesheets/[id]`. Add, edit, or delete individual date entries within the defined date range.
5. **Submit**: Click "Submit for Approval". The status switches to `submitted`, locked from edits, and Resend delivers an email alert to the supervisor.
6. **Share**: Generate signed HMAC share links to send to supervisors or external stakeholders for quick preview.

### B. Supervisor Flow
1. **Notification / Assigned Tab**: Supervisor receives an email link or logs into `/dashboard` under "Assigned To Me".
2. **Review View**: Navigate to `/review/[id]`. The supervisor views total hours, employee details, and date breakdown.
3. **Approve / Reject**:
   - Supervisor approves or rejects individual daily entries.
   - When all entries are approved, timesheet status shifts to `approved`.
   - If any entry is rejected, timesheet status shifts to `rejected`.
4. **Shared Direct Approval**: Supervisors clicking a shared preview link (`/timesheets/preview/[token]`) can log in, view details at `/timesheets/share/[id]`, and approve the entire timesheet in one click.

---

## 7. Developer & Agent Guidelines

- **Consult Docs First**: When starting a new task, review this entrypoint and the relevant subsystem doc before making modifications.
- **Maintain Docs**: Any changes to schemas, Server Actions, routes, or component interfaces must be reflected across the corresponding markdown files in `DOCS/`. See [Doc Updater Skill](skills/doc-updater.md).
- **Audit Bugs & Flaws**: Use [Bug & UI/UX Flaw Finder](skills/bug-and-ui-flaw-finder.md) to audit changes for edge cases, permission loopholes, and UX flaws.
- **Strict Typing & Linting**: Always verify changes by running `npx --package=typescript tsc --noEmit && npm run lint`.
