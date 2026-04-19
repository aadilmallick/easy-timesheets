import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CloudDatabase } from "@/db/CloudDatabase";
import { TimesheetDetail } from "./TimesheetDetail";

export default async function TimesheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const name = `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();
  const dbUser = await CloudDatabase.upsertUser({ clerkUserId: userId, email, name });

  const [timesheet, entries] = await Promise.all([
    CloudDatabase.getTimesheetById(id),
    CloudDatabase.getEntriesForTimesheet(id),
  ]);

  if (!timesheet) notFound();
  if (timesheet.employee_user_id !== dbUser.id) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <TimesheetDetail
        timesheet={timesheet}
        entries={entries}
        employeeName={name || dbUser.email}
        showTestEmailButton={process.env.NODE_ENV === "development"}
      />
    </div>
  );
}
