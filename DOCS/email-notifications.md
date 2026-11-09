# Email Notifications

This document describes transactional email notifications, the Resend integration, email templates, and testing utilities in **Easy Timesheets**.

---

## 1. Overview & Setup

Timesheet submission alerts are delivered using **Resend** (`resend`).

### Configuration
- `RESEND_API_KEY`: API key obtained from Resend. If missing or empty in development, email dispatch is safely skipped with a console warning.
- `NEXT_PUBLIC_APP_URL`: Base application URL (e.g. `http://localhost:3000` or production domain) used to formulate review action links.
- Sender Address: Configured in `lib/email.ts` as `Timesheets <team@aadilmallick.com>`.

---

## 2. Notification Triggers

### Timesheet Submission
When an employee clicks "Submit for Approval" on a draft timesheet:
1. `submitTimesheet(id)` Server Action transitions status to `submitted`.
2. Dispatches `sendTimesheetSubmittedEmail`:
   - **Recipient**: `timesheet.supervisor_email`.
   - **Subject**: `"Timesheet Submitted for Approval"`.
   - **Content**:
     - Employee name.
     - Timesheet title.
     - Formatted date range (`formatDate(start_date)` – `formatDate(end_date)`).
     - Direct button/link to `/review/[timesheetId]`.

```typescript
export async function sendTimesheetSubmittedEmail(params: {
  supervisorEmail: string;
  employeeName: string;
  timesheetTitle: string;
  startDate: string;
  endDate: string;
  timesheetId: string;
}) { ... }
```

---

## 3. Email Normalization Helpers (`lib/email-address.ts`)

To avoid missed links or duplicate records due to capitalization or whitespace:
- `normalizeEmail(email: string): string`: Returns `email.trim().toLowerCase()`.
- `emailsEqual(left: string, right: string): boolean`: Compares normalized values.

---

## 4. Development Testing Utilities

In development (`NODE_ENV === "development"`):
- The `TimesheetDetail` page renders a **"Test Email"** button.
- Invokes the `sendTestSupervisorEmail(id)` Server Action.
- Calls `sendSupervisorTestEmail(supervisorEmail)` to verify Resend delivery without needing to transition timesheet statuses.
