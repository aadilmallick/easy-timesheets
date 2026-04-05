"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Timesheet } from "@/db/CloudDatabase";
import { deleteTimesheet, submitTimesheet } from "@/app/actions/timesheets";
import { getDashboardTimesheetsForPolling } from "@/app/actions/polling";
import { useTimesheetPolling } from "@/hooks/useTimesheetPolling";
import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
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

function DeleteTimesheetDialog({
  id,
  title,
  isPending,
  onConfirm,
}: {
  id: string;
  title: string;
  isPending: boolean;
  onConfirm: (id: string) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={isPending} />
        }
      >
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete timesheet?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>&quot;{title}&quot;</strong> will be permanently deleted.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            onClick={() => onConfirm(id)}
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MyTimesheetsTable({ timesheets }: { timesheets: Timesheet[] }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteTimesheet(id);
      if (res.error) toast.error(res.error);
      else toast.success("Timesheet deleted");
    });
  };

  const handleSubmit = (id: string) => {
    startTransition(async () => {
      const res = await submitTimesheet(id);
      if (res.error) toast.error(res.error);
      else toast.success("Timesheet submitted for approval!");
    });
  };

  if (timesheets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No timesheets yet. Create one to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Date Range</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Supervisor</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timesheets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(t.start_date)} – {formatDate(t.end_date)}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[t.status]}`}
              >
                {t.status}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {t.supervisor_email}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(t.updated_at)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link
                  href={`/timesheets/${t.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View
                </Link>
                {t.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(t.id)}
                    disabled={isPending}
                  >
                    Submit
                  </Button>
                )}
                <DeleteTimesheetDialog
                  id={t.id}
                  title={t.title}
                  isPending={isPending}
                  onConfirm={handleDelete}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AssignedTimesheetsTable({ timesheets }: { timesheets: Timesheet[] }) {
  if (timesheets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No timesheets assigned to you yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Date Range</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timesheets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm text-muted-foreground">
              {t.employee_email}
            </TableCell>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(t.start_date)} – {formatDate(t.end_date)}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[t.status]}`}
              >
                {t.status}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/review/${t.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Review
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DashboardTabs({
  myTimesheets,
  assignedTimesheets,
}: {
  myTimesheets: Timesheet[];
  assignedTimesheets: Timesheet[];
}) {
  const { data } = useTimesheetPolling({
    queryKey: ["dashboard-timesheets"],
    queryFn: getDashboardTimesheetsForPolling,
  });
  const polledData = data ?? { myTimesheets, assignedTimesheets };

  return (
    <Tabs defaultValue="mine">
      <TabsList>
        <TabsTrigger value="mine">
          My Timesheets{" "}
          <Badge variant="secondary" className="ml-1.5">
            {polledData.myTimesheets.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="assigned">
          Assigned To Me{" "}
          <Badge variant="secondary" className="ml-1.5">
            {polledData.assignedTimesheets.length}
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="mine" className="mt-4">
        <MyTimesheetsTable timesheets={polledData.myTimesheets} />
      </TabsContent>
      <TabsContent value="assigned" className="mt-4">
        <AssignedTimesheetsTable timesheets={polledData.assignedTimesheets} />
      </TabsContent>
    </Tabs>
  );
}
