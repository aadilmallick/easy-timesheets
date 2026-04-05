import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CloudDatabase } from "@/db/CloudDatabase";
import { ReviewDetail } from "./ReviewDetail";

export default async function ReviewPage({
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

  // Allow review if user is the assigned supervisor
  if (timesheet.supervisor_user_id !== dbUser.id) {
    // Could be a brand-new user following an email link — try linking
    await CloudDatabase.linkSupervisorByEmail(email, dbUser.id);
    const refreshed = await CloudDatabase.getTimesheetById(id);
    if (refreshed?.supervisor_user_id !== dbUser.id) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReviewDetail timesheet={timesheet} entries={entries} />
    </div>
  );
}
