import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CloudDatabase } from "@/db/CloudDatabase";
import { formatDate } from "@/lib/date";
import { getTimesheetIdFromShareToken } from "@/lib/timesheet-share";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getPreviewTimesheet(token: string) {
  const timesheetId = getTimesheetIdFromShareToken(token);
  if (!timesheetId) {
    return null;
  }

  return CloudDatabase.getTimesheetById(timesheetId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const timesheet = await getPreviewTimesheet(token);

  if (!timesheet) {
    return {
      title: "Shared Timesheet Preview",
      description: "A shared timesheet preview from Easy Timesheets.",
    };
  }

  const title = `Timesheet for ${timesheet.supervisor_email}`;
  const statusText =
    timesheet.status === "approved" ? "Approved" : "Not yet approved";
  const description = `${timesheet.supervisor_email} · ${statusText} · ${formatDate(timesheet.start_date)} – ${formatDate(timesheet.end_date)}`;
  const url = `${appUrl}/timesheets/preview/${token}`;

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
      type: "website",
      images: [
        {
          url: `/timesheets/preview/${token}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${timesheet.supervisor_email} ${statusText.toLowerCase()} shared timesheet preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/timesheets/preview/${token}/opengraph-image`],
    },
  };
}

export default async function TimesheetPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const timesheet = await getPreviewTimesheet(token);
  if (!timesheet) notFound();

  const { userId } = await auth();
  const sharePath = `/timesheets/share/${timesheet.id}`;
  const statusText =
    timesheet.status === "approved" ? "Approved" : "Not Yet Approved";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-border bg-white/90 p-8 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Shared Timesheet Preview
          </p>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              {timesheet.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {formatDate(timesheet.start_date)} – {formatDate(timesheet.end_date)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-muted/20 p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Supervisor Email</p>
            <p className="mt-1 text-xl font-semibold">
              {timesheet.supervisor_email}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Timesheet Status</p>
            <p className="mt-1 text-xl font-semibold">{statusText}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          Only the assigned supervisor can open the full shared timesheet and
          approve it after signing in.
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {userId ? (
            <Link href={sharePath}>
              <Button size="lg">Open Shared Timesheet</Button>
            </Link>
          ) : (
            <SignInButton
              forceRedirectUrl={sharePath}
              fallbackRedirectUrl={sharePath}
            ><Button size="lg">Sign In To Review</Button></SignInButton>
          )}
          <Link href="/">
            <Button variant="outline" size="lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
