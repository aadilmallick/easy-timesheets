<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Instructions for Easy Timesheets

## 1. Documentation First
- **Start of Session**: Always peruse `DOCS/codebase.md` at the beginning of a session to understand the architecture, database schema, component boundaries, and workflows.
- Use the detailed documentation files in `DOCS/` for specific subsystem deep dives:
  - `DOCS/architecture.md`: App Router, Server vs. Client boundaries, data flows.
  - `DOCS/database.md`: Postgres schema, Neon serverless queries, `CloudDatabase` class.
  - `DOCS/components.md`: UI components, routes, modals, and design system.
  - `DOCS/actions-and-workflows.md`: Server Actions, Zod schemas, lifecycles.
  - `DOCS/auth-and-security.md`: Clerk authentication, middleware, HMAC tokens.
  - `DOCS/email-notifications.md`: Resend email integration and templates.

## 2. Keeping Documentation Up to Date
- Keep the codebase documentation in check! Whenever you make substantial changes to the codebase (e.g., adding or updating database schemas, altering Server Actions, introducing new components/routes, or changing workflows), you **must update the relevant markdown files in `DOCS/`** to reflect the new state.
- Refer to `DOCS/skills/doc-updater.md` for guidelines and instructions on updating the documentation.

## 3. Auditing Bugs & UI/UX Flaws
- When auditing, reviewing, or fixing issues, use `DOCS/skills/bug-and-ui-flaw-finder.md` to find bugs, permission loopholes, and UI/UX flaws in the application, highlight them with severity and steps to reproduce, and suggest clean fixes.

## 4. Engineering Conventions
- **Server Components**: Prefer React Server Components over Client Components (`"use client"`) except when client-side interactivity, state, or hooks are necessary.
- **Data Access**: Always use the `CloudDatabase` class in `db/CloudDatabase.ts` for database operations. Do not write raw SQL inside components or server actions directly.
- **Neon SQL Typing**: When writing SQL in `db/CloudDatabase.ts`, always add explicit PostgreSQL type casts (e.g., `::text`, `::boolean`, `::uuid`, `::date`) to parameters that may evaluate to `null` or are used inside `COALESCE` or `CASE WHEN` to avoid Neon/Postgres error `42P18`.
- **Validation**: Use Zod for schema validation across Server Actions.
- **UI Components**: Use shadcn/ui primitives located in `components/ui/` styled with Tailwind CSS.
- **Verification**: Verify all changes with `npx --package=typescript tsc --noEmit && npm run lint`. Note that `npm run build` requires `DATABASE_URL` (e.g. `DATABASE_URL=postgres://dummy:dummy@dummy/dummy npm run build`).
