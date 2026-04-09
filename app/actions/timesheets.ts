"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CloudDatabase } from "@/db/CloudDatabase";
import { isDateWithinRange } from "@/lib/date";
import { sendTimesheetSubmittedEmail } from "@/lib/email";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("User not found");

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();

  const dbUser = await CloudDatabase.upsertUser({
    clerkUserId: userId,
    email,
    name,
  });

  // Link any timesheets where this user is the supervisor
  await CloudDatabase.linkSupervisorByEmail(email, dbUser.id);

  return dbUser;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const createTimesheetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  supervisorEmail: z.string().email("Valid supervisor email is required"),
});

const addEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.5).max(24),
  description: z.string().optional(),
});

const updateEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  hours: z.coerce.number().min(0.5).max(24),
  description: z.string().optional(),
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createTimesheet(formData: FormData) {
  const dbUser = await getDbUser();

  const parsed = createTimesheetSchema.safeParse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    supervisorEmail: formData.get("supervisorEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const timesheet = await CloudDatabase.createTimesheet({
    title: parsed.data.title,
    employeeUserId: dbUser.id,
    employeeEmail: dbUser.email,
    supervisorEmail: parsed.data.supervisorEmail,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
  });

  revalidatePath("/dashboard");
  redirect(`/timesheets/${timesheet.id}`);
}

export async function updateTimesheet(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const timesheet = await CloudDatabase.getTimesheetById(id);
  if (!timesheet || timesheet.employee_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }

  const parsed = createTimesheetSchema.safeParse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    supervisorEmail: formData.get("supervisorEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await CloudDatabase.updateTimesheet(id, {
    title: parsed.data.title,
    supervisorEmail: parsed.data.supervisorEmail,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteTimesheet(id: string): Promise<{ error?: string }> {
  const dbUser = await getDbUser();
  await CloudDatabase.deleteTimesheet(id, dbUser.id);
  revalidatePath("/dashboard");
  return {};
}

export async function submitTimesheet(id: string): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const timesheet = await CloudDatabase.submitTimesheet(id, dbUser.id);
  if (!timesheet) return { error: "Could not submit timesheet" };

  // Send email to supervisor
  try {
    await sendTimesheetSubmittedEmail({
      supervisorEmail: timesheet.supervisor_email,
      employeeName: dbUser.name ?? dbUser.email,
      timesheetTitle: timesheet.title,
      startDate: timesheet.start_date,
      endDate: timesheet.end_date,
      timesheetId: timesheet.id,
    });
  } catch {
    // Don't fail the action if email fails
  }

  revalidatePath("/dashboard");
  revalidatePath(`/timesheets/${id}`);
  return {};
}

export async function addEntry(formData: FormData): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const parsed = addEntrySchema.safeParse({
    timesheetId: formData.get("timesheetId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const timesheet = await CloudDatabase.getTimesheetById(parsed.data.timesheetId);
  if (!timesheet || timesheet.employee_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }
  if (timesheet.status !== "draft") {
    return { error: "Only draft timesheets can be edited" };
  }
  if (
    !isDateWithinRange(
      parsed.data.date,
      timesheet.start_date,
      timesheet.end_date
    )
  ) {
    return { error: "Entry date must be within the timesheet range" };
  }

  const existingEntry = await CloudDatabase.getEntryForTimesheetOnDate(
    parsed.data.timesheetId,
    parsed.data.date
  );
  if (existingEntry) {
    return { error: "An entry already exists for that date" };
  }

  await CloudDatabase.addEntry({
    timesheetId: parsed.data.timesheetId,
    date: parsed.data.date,
    hours: parsed.data.hours,
    description: parsed.data.description,
  });

  revalidatePath(`/timesheets/${parsed.data.timesheetId}`);
  return {};
}

export async function deleteEntry(
  entryId: string,
  timesheetId: string
): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const timesheet = await CloudDatabase.getTimesheetById(timesheetId);
  if (!timesheet || timesheet.employee_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }
  if (timesheet.status !== "draft") {
    return { error: "Only draft timesheets can be edited" };
  }

  const deleted = await CloudDatabase.deleteEntry(entryId, timesheetId);
  if (!deleted) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/timesheets/${timesheetId}`);
  return {};
}

export async function updateEntry(
  entryId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const parsed = updateEntrySchema.safeParse({
    timesheetId: formData.get("timesheetId"),
    hours: formData.get("hours"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const timesheet = await CloudDatabase.getTimesheetById(parsed.data.timesheetId);
  if (!timesheet || timesheet.employee_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }
  if (timesheet.status !== "draft") {
    return { error: "Only draft timesheets can be edited" };
  }

  const entry = await CloudDatabase.updateEntry(entryId, {
    timesheetId: parsed.data.timesheetId,
    hours: parsed.data.hours,
    description: parsed.data.description,
  });
  if (!entry) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/timesheets/${parsed.data.timesheetId}`);
  return {};
}

export async function approveEntry(
  entryId: string,
  timesheetId: string
): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const timesheet = await CloudDatabase.getTimesheetById(timesheetId);
  if (!timesheet || timesheet.supervisor_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }

  await CloudDatabase.approveEntry(entryId);
  await CloudDatabase.recalcTimesheetStatus(timesheetId);
  revalidatePath(`/review/${timesheetId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function rejectEntry(
  entryId: string,
  timesheetId: string
): Promise<{ error?: string }> {
  const dbUser = await getDbUser();

  const timesheet = await CloudDatabase.getTimesheetById(timesheetId);
  if (!timesheet || timesheet.supervisor_user_id !== dbUser.id) {
    return { error: "Not authorized" };
  }

  await CloudDatabase.rejectEntry(entryId);
  await CloudDatabase.recalcTimesheetStatus(timesheetId);
  revalidatePath(`/review/${timesheetId}`);
  revalidatePath("/dashboard");
  return {};
}
