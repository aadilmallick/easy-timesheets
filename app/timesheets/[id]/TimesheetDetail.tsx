"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Timesheet, TimesheetEntry } from "@/db/CloudDatabase";
import {
  addEntry,
  deleteEntry,
  sendTestSupervisorEmail,
  submitTimesheet,
  updateEntry,
  updateTimesheet,
} from "@/app/actions/timesheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDate, getDateOnlyValue } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

function AddEntryDialog({
  timesheetId,
  startDate,
  endDate,
  existingDates,
}: {
  timesheetId: string;
  startDate: string;
  endDate: string;
  existingDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("timesheetId", timesheetId);

    const selectedDate = getDateOnlyValue(String(formData.get("date") ?? ""));
    if (existingDates.includes(selectedDate)) {
      toast.error("An entry already exists for that date");
      return;
    }

    startTransition(async () => {
      const res = await addEntry(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Entry added");
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Add Entry</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Hours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              min={getDateOnlyValue(startDate)}
              max={getDateOnlyValue(endDate)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              name="hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              placeholder="8"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What did you work on?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  entry,
  timesheetId,
}: {
  entry: TimesheetEntry;
  timesheetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("timesheetId", timesheetId);

    startTransition(async () => {
      const res = await updateEntry(entry.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Entry updated");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-hours-${entry.id}`}>Hours</Label>
            <Input
              id={`edit-hours-${entry.id}`}
              name="hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              defaultValue={String(Number(entry.hours))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-description-${entry.id}`}>
              Description (optional)
            </Label>
            <Textarea
              id={`edit-description-${entry.id}`}
              name="description"
              defaultValue={entry.description ?? ""}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTimesheetDialog({ timesheet }: { timesheet: Timesheet }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTimesheet(timesheet.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Timesheet updated");
        setOpen(false);
      }
    });
  };

  if (isPending) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timesheet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={timesheet.title}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Start Date</Label>
              <Input
                id="edit-start"
                name="startDate"
                type="date"
                defaultValue={getDateOnlyValue(timesheet.start_date)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">End Date</Label>
              <Input
                id="edit-end"
                name="endDate"
                type="date"
                defaultValue={getDateOnlyValue(timesheet.end_date)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-supervisor">Supervisor Email</Label>
            <Input
              id="edit-supervisor"
              name="supervisorEmail"
              type="email"
              defaultValue={timesheet.supervisor_email}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TimesheetDetail({
  timesheet,
  entries,
  employeeName,
  showTestEmailButton,
}: {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
  employeeName: string;
  showTestEmailButton: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isDraft = timesheet.status === "draft";

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await submitTimesheet(timesheet.id);
      if (res.error) toast.error(res.error);
      else toast.success("Timesheet submitted for approval!");
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    startTransition(async () => {
      const res = await deleteEntry(entryId, timesheet.id);
      if (res.error) toast.error(res.error);
      else toast.success("Entry removed");
    });
  };

  const handleTestEmail = () => {
    startTransition(async () => {
      const res = await sendTestSupervisorEmail(timesheet.id);
      if (res.error) toast.error(res.error);
      else toast.success("Test email sent");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{timesheet.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatDate(timesheet.start_date)} –{" "}
            {formatDate(timesheet.end_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              statusColors[timesheet.status]
            }`}
          >
            {timesheet.status}
          </span>
          {showTestEmailButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestEmail}
              disabled={isPending}
            >
              Test Email
            </Button>
          )}
          {isDraft && (
            <>
              <EditTimesheetDialog timesheet={timesheet} />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || entries.length === 0}
              >
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Supervisor</p>
          <p className="font-medium">{timesheet.supervisor_email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Employee</p>
          <p className="font-medium">{employeeName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Hours</p>
          <p className="font-medium">{totalHours.toFixed(1)} hrs</p>
        </div>
      </div>

      <Separator />

      {/* Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Time Entries</h2>
          {isDraft && (
            <AddEntryDialog
              timesheetId={timesheet.id}
              startDate={timesheet.start_date}
              endDate={timesheet.end_date}
              existingDates={entries.map((entry) => getDateOnlyValue(entry.date))}
            />
          )}
        </div>

        {entries.length === 0
          ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No entries yet.{isDraft ? " Add hours to get started." : ""}
            </p>
          )
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {isDraft && (
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
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          entryStatusColors[entry.approval_status]
                        }`}
                      >
                        {entry.approval_status}
                      </span>
                    </TableCell>
                    {isDraft && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EditEntryDialog
                            entry={entry}
                            timesheetId={timesheet.id}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={isPending}
                          >
                            Remove
                          </Button>
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
