import { neon } from "@neondatabase/serverless";
import { normalizeEmail } from "@/lib/email-address";

const sql = neon(process.env.DATABASE_URL!);

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type EntryStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Timesheet {
  id: string;
  title: string;
  employee_user_id: string;
  employee_email: string;
  supervisor_user_id: string | null;
  supervisor_email: string;
  start_date: string;
  end_date: string;
  status: TimesheetStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  date: string;
  hours: number;
  description: string | null;
  approval_status: EntryStatus;
  created_at: string;
  updated_at: string;
}

export class CloudDatabase {
  // ── Users ──────────────────────────────────────────────────────────────────

  static async upsertUser(params: {
    clerkUserId: string;
    email: string;
    name?: string;
  }): Promise<User> {
    const email = normalizeEmail(params.email);

    const existingRows = await sql`
      SELECT * FROM users
      WHERE clerk_user_id = ${params.clerkUserId}
         OR LOWER(email) = ${email}
         OR email = ${params.email}
      LIMIT 1
    `;

    if (existingRows[0]) {
      const existing = existingRows[0] as User;
      const rows = await sql`
        UPDATE users
        SET clerk_user_id = ${params.clerkUserId},
            email = ${email},
            name = COALESCE(${params.name ?? null}, name)
        WHERE id = ${existing.id}
        RETURNING *
      `;
      return rows[0] as User;
    }

    const rows = await sql`
      INSERT INTO users (clerk_user_id, email, name)
      VALUES (${params.clerkUserId}, ${email}, ${params.name ?? null})
      ON CONFLICT (clerk_user_id)
        DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
      RETURNING *
    `;
    return rows[0] as User;
  }

  static async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    const rows = await sql`
      SELECT * FROM users WHERE clerk_user_id = ${clerkUserId}
    `;
    return (rows[0] as User) ?? null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);
    const rows = await sql`
      SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail}
    `;
    return (rows[0] as User) ?? null;
  }

  // ── Timesheets ─────────────────────────────────────────────────────────────

  static async createTimesheet(params: {
    title: string;
    employeeUserId: string;
    employeeEmail: string;
    supervisorEmail: string;
    startDate: string;
    endDate: string;
  }): Promise<Timesheet> {
    const employeeEmail = normalizeEmail(params.employeeEmail);
    const supervisorEmail = normalizeEmail(params.supervisorEmail);
    const supervisorUser = await CloudDatabase.getUserByEmail(
      supervisorEmail,
    );

    const rows = await sql`
      INSERT INTO timesheets (
        title, employee_user_id, employee_email,
        supervisor_user_id, supervisor_email,
        start_date, end_date, status
      )
      VALUES (
        ${params.title}, ${params.employeeUserId}, ${employeeEmail},
        ${supervisorUser?.id ?? null}, ${supervisorEmail},
        ${params.startDate}, ${params.endDate}, 'draft'
      )
      RETURNING *
    `;
    return rows[0] as Timesheet;
  }

  static async getTimesheetById(id: string): Promise<Timesheet | null> {
    const rows = await sql`
      SELECT * FROM timesheets WHERE id = ${id}
    `;
    return (rows[0] as Timesheet) ?? null;
  }

  static async getMyTimesheets(employeeUserId: string): Promise<Timesheet[]> {
    const rows = await sql`
      SELECT * FROM timesheets
      WHERE employee_user_id = ${employeeUserId}
      ORDER BY created_at DESC
    `;
    return rows as Timesheet[];
  }

  static async getAssignedTimesheets(
    supervisorUserId: string,
  ): Promise<Timesheet[]> {
    const rows = await sql`
      SELECT * FROM timesheets
      WHERE supervisor_user_id = ${supervisorUserId}
      ORDER BY created_at DESC
    `;
    return rows as Timesheet[];
  }

  static async updateTimesheet(
    id: string,
    params: {
      title?: string;
      supervisorEmail?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Timesheet> {
    let supervisorUserId: string | null | undefined = undefined;
    const supervisorEmail = params.supervisorEmail
      ? normalizeEmail(params.supervisorEmail)
      : undefined;

    if (supervisorEmail) {
      const supervisorUser = await CloudDatabase.getUserByEmail(
        supervisorEmail,
      );
      supervisorUserId = supervisorUser?.id ?? null;
    }

    const rows = await sql`
      UPDATE timesheets SET
        title = COALESCE(${params.title ?? null}, title),
        supervisor_email = COALESCE(${
      supervisorEmail ?? null
    }, supervisor_email),
        supervisor_user_id = CASE
          WHEN ${supervisorEmail ?? null} IS NOT NULL THEN ${
      supervisorUserId ?? null
    }
          ELSE supervisor_user_id
        END,
        start_date = COALESCE(${params.startDate ?? null}, start_date),
        end_date = COALESCE(${params.endDate ?? null}, end_date),
        updated_at = NOW()
      WHERE id = ${id} AND status = 'draft'
      RETURNING *
    `;
    return rows[0] as Timesheet;
  }

  static async deleteTimesheet(
    id: string,
    employeeUserId: string,
  ): Promise<void> {
    await sql`
      DELETE FROM timesheets
      WHERE id = ${id} AND employee_user_id = ${employeeUserId}
    `;
  }

  static async submitTimesheet(
    id: string,
    employeeUserId: string,
  ): Promise<Timesheet> {
    const rows = await sql`
      UPDATE timesheets SET
        status = 'submitted',
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id} AND employee_user_id = ${employeeUserId} AND status = 'draft'
      RETURNING *
    `;
    return rows[0] as Timesheet;
  }

  static async updateTimesheetStatus(
    id: string,
    status: TimesheetStatus,
  ): Promise<Timesheet> {
    const rows = await sql`
      UPDATE timesheets SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] as Timesheet;
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  static async addEntry(params: {
    timesheetId: string;
    date: string;
    hours: number;
    description?: string;
  }): Promise<TimesheetEntry> {
    const rows = await sql`
      INSERT INTO timesheet_entries (timesheet_id, date, hours, description)
      VALUES (${params.timesheetId}, ${params.date}, ${params.hours}, ${
      params.description ?? null
    })
      RETURNING *
    `;
    return rows[0] as TimesheetEntry;
  }

  static async getEntryForTimesheetOnDate(
    timesheetId: string,
    date: string,
  ): Promise<TimesheetEntry | null> {
    const rows = await sql`
      SELECT * FROM timesheet_entries
      WHERE timesheet_id = ${timesheetId} AND date = ${date}
      LIMIT 1
    `;
    return (rows[0] as TimesheetEntry) ?? null;
  }

  static async updateEntry(
    id: string,
    params: {
      timesheetId: string;
      hours: number;
      description?: string;
    },
  ): Promise<TimesheetEntry | null> {
    const rows = await sql`
      UPDATE timesheet_entries SET
        hours = ${params.hours},
        description = ${params.description ?? null},
        updated_at = NOW()
      WHERE id = ${id} AND timesheet_id = ${params.timesheetId}
      RETURNING *
    `;
    return (rows[0] as TimesheetEntry) ?? null;
  }

  static async getEntriesForTimesheet(
    timesheetId: string,
  ): Promise<TimesheetEntry[]> {
    const rows = await sql`
      SELECT * FROM timesheet_entries
      WHERE timesheet_id = ${timesheetId}
      ORDER BY date ASC
    `;
    return rows as TimesheetEntry[];
  }

  static async deleteEntry(id: string, timesheetId: string): Promise<boolean> {
    const rows = await sql`
      DELETE FROM timesheet_entries
      WHERE id = ${id} AND timesheet_id = ${timesheetId}
      RETURNING id
    `;
    return rows.length > 0;
  }

  static async approveEntry(id: string): Promise<TimesheetEntry> {
    const rows = await sql`
      UPDATE timesheet_entries SET approval_status = 'approved', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] as TimesheetEntry;
  }

  static async rejectEntry(id: string): Promise<TimesheetEntry> {
    const rows = await sql`
      UPDATE timesheet_entries SET approval_status = 'rejected', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] as TimesheetEntry;
  }

  static async getPendingEntryCount(timesheetId: string): Promise<number> {
    const rows = await sql`
      SELECT COUNT(*) as count FROM timesheet_entries
      WHERE timesheet_id = ${timesheetId} AND approval_status = 'pending'
    `;
    return Number((rows[0] as { count: string }).count);
  }

  static async recalcTimesheetStatus(timesheetId: string): Promise<void> {
    const rows = await sql`
      SELECT approval_status, COUNT(*) as count
      FROM timesheet_entries
      WHERE timesheet_id = ${timesheetId}
      GROUP BY approval_status
    `;
    const counts: Record<string, number> = {};
    for (const row of rows as { approval_status: string; count: string }[]) {
      counts[row.approval_status] = Number(row.count);
    }
    const pending = counts["pending"] ?? 0;
    const rejected = counts["rejected"] ?? 0;
    const approved = counts["approved"] ?? 0;
    const total = pending + rejected + approved;

    if (total === 0 || pending > 0) return;

    const newStatus: TimesheetStatus = rejected > 0 ? "rejected" : "approved";

    await sql`
      UPDATE timesheets SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${timesheetId} AND status = 'submitted'
    `;
  }

  static async linkSupervisorByEmail(
    email: string,
    userId: string,
  ): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    await sql`
      UPDATE timesheets SET supervisor_user_id = ${userId}
      WHERE LOWER(supervisor_email) = ${normalizedEmail} AND supervisor_user_id IS NULL
    `;
  }
}
