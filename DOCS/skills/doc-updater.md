# Skill: Doc Updater

## Purpose
This skill defines the standardized protocol and checklist for AI agents to audit, maintain, and synchronize the codebase documentation in `DOCS/` whenever substantial architectural, schema, or functional changes are introduced into the application.

---

## When to Run This Skill
Run this procedure whenever any of the following occur:
1. **Schema Modifications**: Changes to `db/schema.sql`, database migrations, enums, or `CloudDatabase.ts` methods.
2. **New Routes or Pages**: Adding, deleting, or refactoring pages under `app/`.
3. **Component Refactoring**: Creating, modifying, or removing UI components, modals, or client interactivity in `components/` or route-specific client components.
4. **Server Actions or Business Logic**: Adding or altering actions in `app/actions/timesheets.ts`, modifying validation rules in Zod schemas, or altering lifecycle transitions.
5. **Authentication, Security, or Middleware**: Changes to `proxy.ts`, Clerk integration, token hashing in `lib/timesheet-share.ts`, or environment configurations.
6. **Integrations**: Changes to third-party services like Resend or external APIs.

---

## Step-by-Step Procedure

### 1. Scope & Impact Analysis
- Run `git status` and `git diff --name-only` to review all modified, created, or deleted files in the working directory.
- Map modified files to the corresponding documentation file:
  - Database & SQL -> `DOCS/database.md`
  - Routes & UI components -> `DOCS/components.md`
  - Server Actions & State lifecycles -> `DOCS/actions-and-workflows.md`
  - System architecture & boundaries -> `DOCS/architecture.md`
  - Auth, Middleware, HMAC -> `DOCS/auth-and-security.md`
  - Notifications & Email -> `DOCS/email-notifications.md`
  - Top-level index & file tree -> `DOCS/codebase.md`

### 2. Update Specific Subsystem Documentation
- Ensure method signatures, parameters, return types, and schema columns match the source code exactly.
- Keep SQL schemas, TypeScript snippets, and tables aligned with the actual implementations.
- If a route, parameter, or component was removed or renamed, update or remove the corresponding documentation section.

### 3. Update the Master Entrypoint (`DOCS/codebase.md`)
- If directory structures or primary subsystem files changed, update the directory layout tree in Section 3 of `DOCS/codebase.md`.
- Ensure all relative markdown links remain valid.

### 4. Verification & Consistency Check
- Check that all internal links between `DOCS/` files use correct relative paths (for example, from `DOCS/codebase.md` to `database.md` or `skills/doc-updater.md`, or from subfolders like `skills/` using `../database.md`).
- Verify headings and markdown syntax.
- Ensure no confidential tokens or production credentials are documented.
