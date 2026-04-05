# Product Requirements Document (PRD)

## Timesheet Approval App

### 1. Overview

The Timesheet Approval App allows employees to submit timesheets and request
approval from supervisors via email. Supervisors can log in to review and
approve or reject submitted hours.

Each user has a dashboard with two views:

1. **My Timesheets** — timesheets created by the user
2. **Assigned To Me** — timesheets where the user was designated as supervisor

The system supports creating timesheets, submitting hours, assigning supervisors
via email, and approving or rejecting submitted hours.

---

# 2. Goals

### Primary Goals

- Enable users to create and manage multiple timesheets
- Allow assigning a supervisor via email
- Allow supervisors to review and approve/reject hours
- Send email notifications when hours are submitted

### Non-Goals (v1)

- Payroll integration
- Time tracking timers
- Advanced reporting
- Organization/team management
- Multi-approver workflows

---

# 3. Tech Stack

Frontend

- **Next.js (App Router)**
- **TypeScript**
- **TailwindCSS**
- **shadcn/ui**

Backend

- **Next.js API Routes / Server Actions**
- **Clerk (Authentication + Users)**
- **Neon PostgreSQL**

Services

- **Resend** (Email delivery)

Deployment

- Vercel

---

# 4. Core User Roles

## Employee

- Creates timesheets
- Adds hours
- Submits timesheets
- Assigns supervisor

## Supervisor

- Receives email when timesheet submitted
- Reviews hours
- Approves or rejects entries
- Views assigned timesheets

Note: Any authenticated user can be either role.

---

# 5. Key Features

## 5.1 Timesheet CRUD

Employees can:

Create a timesheet Edit a timesheet Delete a timesheet Submit a timesheet for
approval

Timesheet fields:

- Title
- Date range
- Supervisor email
- Status

Statuses:

```
draft
submitted
approved
rejected
```

Rules:

- Draft timesheets are editable
- Submitted timesheets are locked for editing
- Supervisor can approve/reject

---

## 5.2 Timesheet Entries (Hours)

Each timesheet contains multiple entries.

Entry fields:

- Date
- Hours worked
- Optional description
- Approval status

Entry approval status:

```
pending
approved
rejected
```

Supervisor reviews entries individually.

---

## 5.3 Supervisor Assignment

When creating a timesheet:

User enters:

```
Supervisor Email
```

Behavior:

If email belongs to existing user → automatically linked

If email not registered → stored and user will be linked when they sign up.

---

## 5.4 Email Notifications

Emails are sent using **Resend**.

### Events

**Timesheet Submitted**

Sent to supervisor.

Email includes:

- Employee name
- Timesheet title
- Date range
- Link to review page

Example email:

```
Subject: Timesheet Submitted for Approval

John Doe submitted a timesheet for approval.

Timesheet: Week of Feb 10
Dates: Feb 10 – Feb 16

Review here:
[Review Timesheet]
```

---

## 5.5 Dashboard

### Dashboard Layout

Two tabs:

```
My Timesheets
Assigned To Me
```

---

### My Timesheets

Shows timesheets created by the user.

Columns:

- Title
- Date range
- Status
- Supervisor
- Last updated
- Actions

Actions:

```
Edit
Submit
Delete
View
```

---

### Assigned To Me

Shows timesheets where user is supervisor.

Columns:

- Employee
- Timesheet title
- Date range
- Status
- Pending entries
- Actions

Actions:

```
Review
Approve
Reject
```

---

# 6. User Flow

## Create Timesheet

Employee:

```
Dashboard
→ My Timesheets
→ Create Timesheet
```

Form:

```
Title
Start Date
End Date
Supervisor Email
```

Creates timesheet with status:

```
draft
```

---

## Add Hours

Inside timesheet:

```
Add Entry
```

Fields:

```
Date
Hours
Description
```

---

## Submit Timesheet

Employee clicks:

```
Submit Timesheet
```

System:

```
status → submitted
```

Email sent to supervisor.

---

## Supervisor Review

Supervisor:

```
Dashboard
→ Assigned To Me
→ Review
```

Supervisor can:

Approve entry Reject entry

When all entries approved:

```
timesheet.status = approved
```

If rejected entries exist:

```
timesheet.status = rejected
```

---

# 7. Database Schema

## users

Managed by Clerk.

We reference Clerk user ID.

```
id (uuid)
clerk_user_id (string)
email (string)
created_at
```

---

## timesheets

```
id (uuid)
title (text)

employee_user_id (uuid)
employee_email (text)

supervisor_user_id (uuid nullable)
supervisor_email (text)

start_date (date)
end_date (date)

status (enum)
created_at
updated_at
submitted_at
```

Status enum:

```
draft
submitted
approved
rejected
```

---

## timesheet_entries

```
id (uuid)
timesheet_id (uuid)

date (date)
hours (decimal)

description (text)

approval_status (enum)

created_at
updated_at
```

Entry status enum:

```
pending
approved
rejected
```

---

# 8. API / Server Actions

## Create Timesheet

```
POST /api/timesheets
```

Input

```
title
start_date
end_date
supervisor_email
```

---

## Get My Timesheets

```
GET /api/timesheets/my
```

---

## Get Assigned Timesheets

```
GET /api/timesheets/assigned
```

---

## Add Entry

```
POST /api/timesheets/:id/entries
```

---

## Submit Timesheet

```
POST /api/timesheets/:id/submit
```

Triggers email notification.

---

## Approve Entry

```
POST /api/entries/:id/approve
```

---

## Reject Entry

```
POST /api/entries/:id/reject
```

---

# 9. Email Integration (Resend)

### Send email on submission

Server action:

```
submitTimesheet()
```

Pseudo:

```ts
await resend.emails.send({
    from: "Timesheets <noreply@timesheets.app>",
    to: supervisorEmail,
    subject: "Timesheet submitted for approval",
    html: renderTimesheetEmail(),
});
```

---

# 10. Authorization Rules

Employee can:

```
create timesheets
edit draft timesheets
delete draft timesheets
submit timesheets
view their timesheets
```

Supervisor can:

```
view assigned timesheets
approve/reject entries
```

Supervisor cannot edit entries.

---

# 11. UI Components (shadcn)

Key components:

```
DataTable
Tabs
Dialog
Form
Input
Textarea
Calendar
Badge
Button
Toast
```

Pages:

```
/dashboard
/timesheets/[id]
/review/[id]
```

---

# 12. Future Enhancements

### v2

- Multiple supervisors
- Comments on entries
- Timesheet templates
- Export to CSV
- Weekly auto-timesheets

### v3

- Organization accounts
- Payroll integration
- Slack notifications
- Mobile UI

---

# 13. MVP Scope

Required:

✔ Authentication (Clerk) ✔ Timesheet CRUD ✔ Add hours ✔ Assign supervisor ✔
Email notifications ✔ Supervisor approval ✔ Dashboard with two tabs

Not required:

✘ Teams ✘ Reporting ✘ Payroll ✘ Timers

---

If you'd like, I can also generate:

- **a full SQL schema + Neon migrations**
- **Drizzle ORM schema**
- **the full Next.js folder structure**
- **or a Cursor/Claude prompt that generates the entire app automatically**.
