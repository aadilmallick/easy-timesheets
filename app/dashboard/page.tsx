import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CloudDatabase } from "@/db/CloudDatabase";
import { DashboardTabs } from "./DashboardTabs";
import { CreateTimesheetDialog } from "./CreateTimesheetDialog";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "View your draft, submitted, approved, and assigned timesheets from the Easy Timesheets dashboard.",
  alternates: {
    canonical: "/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Timesheet Dashboard",
    description:
      "Manage your timesheets and review assigned approvals from a single dashboard.",
    url: "/dashboard",
  },
  twitter: {
    title: "Timesheet Dashboard",
    description:
      "Manage your timesheets and review assigned approvals from a single dashboard.",
  },
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const name = `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();

  const dbUser = await CloudDatabase.upsertUser({ clerkUserId: userId, email, name });
  await CloudDatabase.linkSupervisorByEmail(dbUser.email, dbUser.id);

  const [myTimesheets, assignedTimesheets] = await Promise.all([
    CloudDatabase.getMyTimesheets(dbUser.id),
    CloudDatabase.getAssignedTimesheets(dbUser.id),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {name || dbUser.email}
          </p>
        </div>
        <CreateTimesheetDialog />
      </div>
      <DashboardTabs
        myTimesheets={myTimesheets}
        assignedTimesheets={assignedTimesheets}
      />
    </div>
  );
}
