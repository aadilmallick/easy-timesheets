"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Timesheet, TimesheetEntry } from "@/db/CloudDatabase";
import { approveEntry, rejectEntry } from "@/app/actions/timesheets";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReviewDetail({
  timesheet,
  entries,
}: {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const canReview = timesheet.status === "submitted";
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  const handleApprove = (entryId: string) => {
    startTransition(async () => {
      const res = await approveEntry(entryId, timesheet.id);
      if (res.error) toast.error(res.error);
      else toast.success("Entry approved");
    });
  };

  const handleReject = (entryId: string) => {
    startTransition(async () => {
      const res = await rejectEntry(entryId, timesheet.id);
      if (res.error) toast.error(res.error);
      else toast.success("Entry rejected");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">{timesheet.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Submitted by {timesheet.employee_email} ·{" "}
              {formatDate(timesheet.start_date)} – {formatDate(timesheet.end_date)}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[timesheet.status]}`}
          >
            {timesheet.status}
          </span>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Total Hours</p>
          <p className="font-medium">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div>
          <p className="text-muted-foreground">Submitted</p>
          <p className="font-medium">
            {timesheet.submitted_at
              ? formatDate(timesheet.submitted_at)
              : "—"}
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Time Entries</h2>

        {!canReview && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              timesheet.status === "approved"
                ? "bg-green-50 text-green-700 border border-green-200"
                : timesheet.status === "rejected"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200"
            }`}
          >
            {timesheet.status === "approved"
              ? "All entries have been approved."
              : timesheet.status === "rejected"
                ? "This timesheet has been rejected."
                : "This timesheet is in draft and cannot be reviewed yet."}
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No entries to review.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                {canReview && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{Number(entry.hours).toFixed(1)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {entry.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${entryStatusColors[entry.approval_status]}`}
                    >
                      {entry.approval_status}
                    </span>
                  </TableCell>
                  {canReview && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {entry.approval_status !== "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleApprove(entry.id)}
                            disabled={isPending}
                          >
                            Approve
                          </Button>
                        )}
                        {entry.approval_status !== "rejected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(entry.id)}
                            disabled={isPending}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
