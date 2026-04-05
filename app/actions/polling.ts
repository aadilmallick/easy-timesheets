"use server";

import { CloudDatabase, type Timesheet, type TimesheetEntry } from "@/db/CloudDatabase";
import { getDbUser } from "./timesheets";

export async function getDashboardTimesheetsForPolling(): Promise<{
  myTimesheets: Timesheet[];
  assignedTimesheets: Timesheet[];
}> {
  const dbUser = await getDbUser();

  const [myTimesheets, assignedTimesheets] = await Promise.all([
    CloudDatabase.getMyTimesheets(dbUser.id),
    CloudDatabase.getAssignedTimesheets(dbUser.id),
  ]);

  return { myTimesheets, assignedTimesheets };
}

export async function getTimesheetDetailForPolling(timesheetId: string): Promise<{
  timesheet: Timesheet | null;
  entries: TimesheetEntry[];
}> {
  const dbUser = await getDbUser();
  const timesheet = await CloudDatabase.getTimesheetById(timesheetId);

  if (!timesheet || timesheet.employee_user_id !== dbUser.id) {
    return { timesheet: null, entries: [] };
  }

  const entries = await CloudDatabase.getEntriesForTimesheet(timesheetId);
  return { timesheet, entries };
}

export async function getReviewDetailForPolling(timesheetId: string): Promise<{
  timesheet: Timesheet | null;
  entries: TimesheetEntry[];
}> {
  const dbUser = await getDbUser();
  const timesheet = await CloudDatabase.getTimesheetById(timesheetId);

  if (!timesheet || timesheet.supervisor_user_id !== dbUser.id) {
    return { timesheet: null, entries: [] };
  }

  const entries = await CloudDatabase.getEntriesForTimesheet(timesheetId);
  return { timesheet, entries };
}
