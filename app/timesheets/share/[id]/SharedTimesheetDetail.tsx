"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Timesheet, TimesheetEntry } from "@/db/CloudDatabase";
import { approveSharedTimesheet } from "@/app/actions/timesheets";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const entryStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function SharedTimesheetDetail({
  timesheet,
  entries,
}: {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const isApproved = timesheet.status === "approved";
  const canApprove = timesheet.status !== "draft" && !isApproved;

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveSharedTimesheet(timesheet.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Timesheet approved");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{timesheet.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted by {timesheet.employee_email} ·{" "}
              {formatDate(timesheet.start_date)} – {formatDate(timesheet.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[timesheet.status]}`}
            >
              {timesheet.status}
            </span>
            {canApprove && (
              <Button onClick={handleApprove} disabled={isPending}>
                {isPending ? "Approving..." : "Approve Timesheet"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Supervisor</p>
          <p className="font-medium">{timesheet.supervisor_email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Submitted</p>
          <p className="font-medium">
            {timesheet.submitted_at ? formatDate(timesheet.submitted_at) : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Hours</p>
          <p className="font-medium">{totalHours.toFixed(1)} hrs</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Time Entries</h2>

        {isApproved && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            This timesheet has already been approved.
          </div>
        )}

        {!isApproved && timesheet.status === "draft" && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            This timesheet is still in draft and cannot be approved yet.
          </div>
        )}

        {!isApproved && timesheet.status === "rejected" && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This timesheet was previously rejected and can still be approved from this page.
          </div>
        )}

        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No entries on this timesheet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{Number(entry.hours).toFixed(1)}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {entry.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${entryStatusColors[entry.approval_status]}`}
                    >
                      {entry.approval_status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
