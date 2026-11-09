# Database & SQL Schema

This document details the PostgreSQL schema, Neon serverless driver integration, indexing strategies, data models, and the `CloudDatabase` abstraction class for **Easy Timesheets**.

---

## 1. Overview & Technology

The database backend is hosted on **Neon PostgreSQL** and queried using `@neondatabase/serverless`.

- **Client Driver**: `neon(process.env.DATABASE_URL!)` produces a serverless SQL query function (`sql`).
- **Query Execution**: All queries are executed over HTTPS/WebSockets, avoiding connection pool limits in serverless runtimes.
- **Data Access Pattern**: Queries are strictly encapsulated inside the static methods of `CloudDatabase` (`db/CloudDatabase.ts`).

---

## 2. SQL Schema Definition (`db/schema.sql`)

The complete database definition consists of 3 tables and 2 custom ENUM types:

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

-- 2. Timesheet Status Enum & Timesheets Table
DO $$ BEGIN
  CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  employee_user_id UUID NOT NULL REFERENCES users(id),
  employee_email TEXT NOT NULL,
  supervisor_user_id UUID REFERENCES users(id),
  supervisor_email TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS timesheets_supervisor_email_lower_idx
  ON timesheets (LOWER(supervisor_email));

-- 3. Entry Status Enum & Timesheet Entries Table
DO $$ BEGIN
  CREATE TYPE entry_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  approval_status entry_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Schema Details & Tables

### A. `users` Table
Stores synced account details from Clerk authentication.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Internal database identifier. |
| `clerk_user_id` | `TEXT` | `UNIQUE NOT NULL` | Clerk user ID (`user_...`). |
| `email` | `TEXT` | `UNIQUE NOT NULL` | Primary email address. |
| `name` | `TEXT` | `NULL` | Full name of the user. |
| `created_at` | `TIMESTAMPTZ`| `DEFAULT NOW()` | Record creation timestamp. |

**Indexes**:
- `users_email_lower_idx`: Unique functional index on `LOWER(email)` ensuring case-insensitive uniqueness and fast lookups.

### B. `timesheets` Table
Represents an individual timesheet period for an employee.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Timesheet identifier. |
| `title` | `TEXT` | `NOT NULL` | Timesheet title (e.g. "Sprint 14"). |
| `employee_user_id` | `UUID` | `NOT NULL REFERENCES users(id)` | Foreign key to the creating employee. |
| `employee_email` | `TEXT` | `NOT NULL` | Stored email of the employee. |
| `supervisor_user_id`| `UUID` | `NULL REFERENCES users(id)` | Linked foreign key to the supervisor. `NULL` if supervisor has not signed up yet. |
| `supervisor_email` | `TEXT` | `NOT NULL` | Email of supervisor assigned to review. |
| `start_date` | `DATE` | `NOT NULL` | Inclusive start date (`YYYY-MM-DD`). |
| `end_date` | `DATE` | `NOT NULL` | Inclusive end date (`YYYY-MM-DD`). |
| `status` | `timesheet_status` | `NOT NULL DEFAULT 'draft'` | Current status: `'draft'`, `'submitted'`, `'approved'`, `'rejected'`. |
| `created_at` | `TIMESTAMPTZ`| `DEFAULT NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| `DEFAULT NOW()` | Last update timestamp. |
| `submitted_at` | `TIMESTAMPTZ`| `NULL` | When the timesheet was submitted for review. |

**Indexes**:
- `timesheets_supervisor_email_lower_idx`: Index on `LOWER(supervisor_email)` for resolving unlinked supervisor timesheets upon user sign-in.

### C. `timesheet_entries` Table
Represents daily hours logged under a specific timesheet.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Entry identifier. |
| `timesheet_id` | `UUID` | `NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE` | Parent timesheet foreign key. Deleting a timesheet cascades to delete entries. |
| `date` | `DATE` | `NOT NULL` | Date for which hours are logged. |
| `hours` | `DECIMAL(5,2)` | `NOT NULL` | Hours worked (0.50 to 24.00). |
| `description` | `TEXT` | `NULL` | Optional work summary. |
| `approval_status` | `entry_status` | `NOT NULL DEFAULT 'pending'` | Entry review state: `'pending'`, `'approved'`, `'rejected'`. |
| `created_at` | `TIMESTAMPTZ`| `DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| `DEFAULT NOW()` | Last modification timestamp. |

---

## 4. `CloudDatabase` API Reference

The `CloudDatabase` class in `db/CloudDatabase.ts` provides strongly typed, static methods:

### User Management
- `upsertUser(params: { clerkUserId: string; email: string; name?: string }): Promise<User>`
  - Matches existing user by `clerk_user_id` or case-insensitive `email`.
  - Updates name and email if existing; inserts new record if not found.
- `getUserByClerkId(clerkUserId: string): Promise<User | null>`
  - Fetches user by Clerk ID.
- `getUserByEmail(email: string): Promise<User | null>`
  - Fetches user by case-insensitive normalized email (`LOWER(email)`).

### Timesheet Management
- `createTimesheet(params): Promise<Timesheet>`
  - Resolves supervisor user ID if existing in `users`, sets status to `'draft'`.
- `getTimesheetById(id: string): Promise<Timesheet | null>`
  - Retrieves a timesheet by UUID.
- `getMyTimesheets(employeeUserId: string): Promise<Timesheet[]>`
  - Returns timesheets created by the employee ordered by `created_at DESC`.
- `getAssignedTimesheets(supervisorUserId: string): Promise<Timesheet[]>`
  - Returns timesheets assigned to the supervisor ordered by `created_at DESC`.
- `updateTimesheet(id: string, params): Promise<Timesheet>`
  - Updates title, supervisor email/id, and end date for draft timesheets.
- `deleteTimesheet(id: string, employeeUserId: string): Promise<void>`
  - Deletes timesheet if it belongs to the given employee user ID.
- `submitTimesheet(id: string, employeeUserId: string): Promise<Timesheet>`
  - Transitions draft timesheet to `'submitted'` and updates `submitted_at = NOW()`.
- `updateTimesheetStatus(id: string, status: TimesheetStatus): Promise<Timesheet>`
  - Updates status and `updated_at`.
- `approveTimesheet(timesheetId: string): Promise<Timesheet | null>`
  - Updates timesheet status to `'approved'`.
- `linkSupervisorByEmail(email: string, userId: string): Promise<void>`
  - Finds any timesheets with `LOWER(supervisor_email) = normalizedEmail` and `supervisor_user_id IS NULL`, setting `supervisor_user_id = userId`.

### Timesheet Entries Management
- `addEntry(params): Promise<TimesheetEntry>`
  - Inserts a new entry with status `'pending'`.
- `getEntryForTimesheetOnDate(timesheetId: string, date: string): Promise<TimesheetEntry | null>`
  - Finds existing entry for a given date in a timesheet (prevents duplicate date entries).
- `updateEntry(id: string, params): Promise<TimesheetEntry | null>`
  - Updates hours and description for a specific entry.
- `getEntriesForTimesheet(timesheetId: string): Promise<TimesheetEntry[]>`
  - Returns entries ordered by `date ASC`.
- `deleteEntry(id: string, timesheetId: string): Promise<boolean>`
  - Deletes entry by ID and parent timesheet ID.
- `approveEntry(id: string): Promise<TimesheetEntry>`
  - Sets entry `approval_status = 'approved'`.
- `rejectEntry(id: string): Promise<TimesheetEntry>`
  - Sets entry `approval_status = 'rejected'`.
- `approveTimesheetEntries(timesheetId: string): Promise<void>`
  - Bulk approves all entries in a timesheet.
- `getPendingEntryCount(timesheetId: string): Promise<number>`
  - Counts pending entries in a timesheet.
- `recalcTimesheetStatus(timesheetId: string): Promise<void>`
  - Recalculates timesheet status after an entry approval/rejection:
    - If total entries > 0 and 0 pending entries:
      - If rejected entries > 0: status -> `'rejected'`.
      - If rejected entries == 0: status -> `'approved'`.

---

## 5. Migration Strategy (`db/migrate.ts`)

The migration runner reads `db/schema.sql`, parses statements while keeping dollar-quoted procedural blocks (`DO $$ ... $$;`) intact, and executes them against the database.

Run migrations via:
```bash
npm run migrate # or: npx tsx db/migrate.ts
```
Statements use `IF NOT EXISTS` guards and `EXCEPTION WHEN duplicate_object THEN null;` blocks, making the migration script idempotent.
