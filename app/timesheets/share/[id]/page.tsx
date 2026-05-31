import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { CloudDatabase } from "@/db/CloudDatabase";
import { formatDate } from "@/lib/date";
import { SharedTimesheetDetail } from "./SharedTimesheetDetail";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const timesheet = await CloudDatabase.getTimesheetById(id);

  if (!timesheet) {
    return {
      title: "Shared Timesheet",
      description: "A shared timesheet from Easy Timesheets.",
    };
  }

  const title = `${timesheet.title} for ${timesheet.supervisor_email}`;
  const description = `Shared timesheet for supervisor ${timesheet.supervisor_email}. ${formatDate(timesheet.start_date)} – ${formatDate(timesheet.end_date)}.`;
  const url = `${appUrl}/timesheets/share/${timesheet.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [
        {
          url: `/timesheets/share/${timesheet.id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${timesheet.title} shared with ${timesheet.supervisor_email}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/timesheets/share/${timesheet.id}/opengraph-image`],
    },
  };
}

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
