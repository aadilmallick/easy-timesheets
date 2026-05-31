import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CloudDatabase } from "@/db/CloudDatabase";
import { SharedTimesheetDetail } from "./SharedTimesheetDetail";

export default async function SharedTimesheetPage({
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

  let authorizedTimesheet = timesheet;

  if (authorizedTimesheet.supervisor_user_id !== dbUser.id) {
    await CloudDatabase.linkSupervisorByEmail(dbUser.email, dbUser.id);
    const refreshed = await CloudDatabase.getTimesheetById(id);
    if (!refreshed || refreshed.supervisor_user_id !== dbUser.id) {
      redirect("/dashboard");
    }
    authorizedTimesheet = refreshed;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SharedTimesheetDetail timesheet={authorizedTimesheet} entries={entries} />
    </div>
  );
}
