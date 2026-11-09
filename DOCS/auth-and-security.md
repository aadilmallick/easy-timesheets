# Authentication & Security

This document covers user authentication, route protection middleware, session synchronization, and cryptographic token verification in **Easy Timesheets**.

---

## 1. Authentication with Clerk

**Easy Timesheets** utilizes **Clerk** (`@clerk/nextjs`) for authentication, managing user identities, sessions, and sign-in/sign-up flows.

### Configuration
Clerk environment keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Frontend publishable key.
- `CLERK_SECRET_KEY`: Server-side API key.

The root application is wrapped in `<ClerkProvider>` in `app/layout.tsx`.

---

## 2. Route Protection & Middleware (`proxy.ts`)

Next.js route protection is handled by `proxy.ts` using Clerk's `clerkMiddleware`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/timesheets/preview/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
```

- Any request to a non-public route (e.g. `/dashboard`, `/timesheets/[id]`, `/review/[id]`, `/timesheets/share/[id]`) automatically enforces an active session. Unauthenticated users are redirected to Clerk's sign-in flow.
- Public routes (`/`, `/sign-in`, `/sign-up`, and `/timesheets/preview/[token]`) are allowed without an active session.

---

## 3. User Synchronization & Supervisor Linking

Because Clerk manages identity credentials, the local PostgreSQL database maintains a lightweight projection of users in the `users` table.

### User Upsert Logic (`CloudDatabase.upsertUser`)
Whenever an authenticated user enters the dashboard or executes a Server Action, `getDbUser()` is invoked:
1. Retrieves Clerk user ID and primary email via `await auth()` and `await currentUser()`.
2. Normalizes the email address (`normalizeEmail` converts to lowercase and trims whitespace).
3. Executes:
   - If an existing record matches `clerk_user_id` or `LOWER(email)`, updates `clerk_user_id`, normalized `email`, and `name`.
   - Otherwise, inserts a new user record.
4. Returns the database `User` object.

### Asynchronous Supervisor Linking (`CloudDatabase.linkSupervisorByEmail`)
Employees often assign timesheets to supervisors who have not yet created an account in the system:
- When the timesheet is created, `supervisor_email` is saved and `supervisor_user_id` is set to `NULL` (if the supervisor does not exist in `users`).
- When the supervisor eventually signs up and logs in, `linkSupervisorByEmail(user.email, user.id)` runs automatically:
  ```sql
  UPDATE timesheets SET supervisor_user_id = $userId
  WHERE LOWER(supervisor_email) = $normalizedEmail AND supervisor_user_id IS NULL;
  ```
- This retrospectively attaches all previously assigned timesheets to the supervisor's dashboard under "Assigned To Me".

---

## 4. Cryptographic Share Tokens (`lib/timesheet-share.ts`)

For secure timesheet previews without exposing sequential IDs or requiring immediate login, the app uses signed HMAC-SHA256 tokens:

```typescript
// Token format: <timesheetId>.<signature>
export function createTimesheetShareToken(timesheetId: string): string;
export function getTimesheetIdFromShareToken(token: string): string | null;
```

### Security Measures:
1. **HMAC-SHA256 Signature**: The signature is generated using `crypto.createHmac("sha256", shareSecret)`.
2. **Secret Key Fallback**: The signing secret uses `TIMESHEET_SHARE_SECRET`, falling back to `CLERK_SECRET_KEY` or `DATABASE_URL`.
3. **UUID Format Validation**: Validates the UUID against a strict regular expression.
4. **Timing-Safe Equality**: Signature comparison uses `crypto.timingSafeEqual` to prevent timing attacks.
5. **Separation of Preview & Modification**: The public token only allows viewing the preview page (`/timesheets/preview/[token]`). It does not allow approving or altering the timesheet without signing in as the assigned supervisor.
