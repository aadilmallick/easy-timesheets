# Actions & Workflows

This document outlines the Next.js Server Actions (`app/actions/timesheets.ts`), Zod validation schemas, timesheet lifecycle workflows, and automated recalculation rules for **Easy Timesheets**.

---

## 1. Server Actions Architecture

All data mutations are handled exclusively through Next.js Server Actions declared in `app/actions/timesheets.ts` using the `"use server"` directive.

### Execution Pattern:
1. **Authentication Verification**: Each action calls the internal helper `getDbUser()`.
   - Fetches the session from Clerk via `auth()`.
   - Retrieves user metadata via `currentUser()`.
   - Upserts the record into the database via `CloudDatabase.upsertUser()`.
   - Links any unlinked supervisor assignments via `CloudDatabase.linkSupervisorByEmail()`.
2. **Schema Validation**: Uses Zod to parse and validate incoming `FormData` or parameters.
3. **Authorization & Invariant Checks**: Verifies that the user owns the timesheet or is the assigned supervisor, and ensures the timesheet is in the expected status (e.g. only `draft` timesheets can be edited).
4. **Data Mutation**: Calls `CloudDatabase` methods.
5. **Cache Invalidation & Side Effects**: Calls `revalidatePath(...)` to update server caches and dispatches transactional emails via Resend when necessary.

---

## 2. Zod Validation Schemas

```typescript
// 1. Create Timesheet Schema
const createTimesheetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  supervisorEmail: z
    .string()
    .trim()
    .email("Valid supervisor email is required")
    .transform(normalizeEmail),
});

// 2. Update Timesheet Schema
const updateTimesheetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  supervisorEmail: z
    .string()
    .trim()
    .email("Valid supervisor email is required")
    .transform(normalizeEmail),
});

// 3. Add Timesheet Entry Schema
const addEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.5).max(24),
  description: z.string().optional(),
});

// 4. Update Timesheet Entry Schema
const updateEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  hours: z.coerce.number().min(0.5).max(24),
  description: z.string().optional(),
});
```

---

## 3. Server Actions Reference

| Action | Parameters | Permissions | Side Effects & Notes |
| :--- | :--- | :--- | :--- |
| `createTimesheet(formData)` | `FormData` (`title`, `startDate`, `endDate`, `supervisorEmail`) | Authenticated user | Creates timesheet in `draft` status, revalidates `/dashboard`, redirects to `/timesheets/:id`. |
| `updateTimesheet(id, formData)` | `id: string`, `FormData` | Employee only, status must be `draft` | Updates title, supervisor email, and end date (only if current end date has not passed). Revalidates `/timesheets/:id` and `/dashboard`. |
| `deleteTimesheet(id)` | `id: string` | Employee only | Cascades deletion of entries, revalidates `/dashboard`. |
| `submitTimesheet(id)` | `id: string` | Employee only, status must be `draft` | Changes status to `submitted`, sets `submitted_at = NOW()`, triggers Resend email to supervisor, revalidates `/dashboard` and `/timesheets/:id`. |
| `sendTestSupervisorEmail(id)` | `id: string` | Employee only, `NODE_ENV === "development"` | Sends a test email to supervisor email address. |
| `addEntry(formData)` | `FormData` (`timesheetId`, `date`, `hours`, `description`) | Employee only, status must be `draft` | Checks date is within timesheet start/end range, checks for duplicate date, inserts entry with `pending` status. |
| `updateEntry(entryId, formData)`| `entryId: string`, `FormData` (`timesheetId`, `hours`, `description`) | Employee only, status must be `draft` | Modifies hours and description. |
| `deleteEntry(entryId, timesheetId)`| `entryId: string`, `timesheetId: string` | Employee only, status must be `draft` | Deletes entry from database. |
| `approveEntry(entryId, timesheetId)`| `entryId: string`, `timesheetId: string` | Supervisor only | Sets entry `approval_status = 'approved'`, calls `recalcTimesheetStatus()`. |
| `rejectEntry(entryId, timesheetId)` | `entryId: string`, `timesheetId: string` | Supervisor only | Sets entry `approval_status = 'rejected'`, calls `recalcTimesheetStatus()`. |
| `approveSharedTimesheet(timesheetId)`| `timesheetId: string` | Supervisor only | Bulk approves all entries and marks timesheet `approved`. |

---

## 4. Timesheet State Lifecycle

Timesheets follow a finite state machine:

```
          [ Employee creates timesheet ]
                         │
                         ▼
                     ┌───────┐
                     │ draft │ ◄── [ Employee adds/edits/deletes entries ]
                     └───────┘
                         │
        [ Employee submits timesheet (entries > 0) ]
                         │
                         ▼
                   ┌───────────┐
                   │ submitted │
                   └───────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[ Supervisor rejects          [ Supervisor approves
  at least 1 entry ]            ALL entries ]
         │                               │
         ▼                               ▼
   ┌──────────┐                    ┌──────────┐
   │ rejected │                    │ approved │
   └──────────┘                    └──────────┘
```

### State Definitions
1. **`draft`**:
   - Initial state upon creation.
   - Employee can add, edit, or delete entries.
   - Employee can edit timesheet title, supervisor email, and extend end date (if not in past).
   - Employee can delete the entire timesheet.
   - Not visible in supervisor's "Assigned To Me" review tab.
2. **`submitted`**:
   - Timesheet is locked for editing.
   - Visible in supervisor's "Assigned To Me" dashboard tab.
   - Supervisor can approve or reject individual entries at `/review/:id`.
   - Supervisor can batch approve via `/timesheets/share/:id`.
3. **`approved`**:
   - Final terminal state when every entry is approved.
   - Read-only for both employee and supervisor.
4. **`rejected`**:
   - Terminal state when one or more entries are rejected.
   - Read-only record of rejected hours.

---

## 5. Entry Status & Status Recalculation

Each entry has an `approval_status`: `'pending'`, `'approved'`, or `'rejected'`.

Whenever a supervisor approves or rejects an individual entry via `approveEntry` or `rejectEntry`, the server invokes:

```typescript
await CloudDatabase.recalcTimesheetStatus(timesheetId);
```

### Recalculation Rules:
1. Count the number of `pending`, `rejected`, and `approved` entries for the timesheet.
2. If there are **no entries** or **at least 1 pending entry**, the timesheet status remains unchanged (`submitted`).
3. If **0 pending entries** remain:
   - If `rejected > 0`: Timesheet status is updated to `'rejected'`.
   - If `rejected === 0` and `approved > 0`: Timesheet status is updated to `'approved'`.
