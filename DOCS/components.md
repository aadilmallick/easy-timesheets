# Components & Pages

This document details all App Router page routes, client components, interactive dialogs, and shadcn/ui components used in **Easy Timesheets**.

---

## 1. Page Routes Overview

The routing hierarchy in `app/` is structured as follows:

```
app/
├── layout.tsx                                    # Root Layout shell
├── page.tsx                                      # Landing Page (/)
├── dashboard/
│   ├── page.tsx                                  # Authenticated Dashboard (/dashboard)
│   ├── loading.tsx                               # Dashboard loading skeleton
│   ├── DashboardTabs.tsx                         # Client Tabs ("My Timesheets" & "Assigned")
│   └── CreateTimesheetDialog.tsx                 # Client modal to create new timesheet
├── timesheets/
│   ├── [id]/
│   │   ├── page.tsx                              # Timesheet view (/timesheets/:id)
│   │   └── TimesheetDetail.tsx                   # Client entries table & management
│   ├── share/[id]/
│   │   ├── page.tsx                              # Authenticated supervisor share view
│   │   ├── SharedTimesheetDetail.tsx             # Supervisor one-click approval
│   │   └── opengraph-image.tsx                   # Dynamic OG card
│   └── preview/[token]/
│       ├── page.tsx                              # Public token-verified preview
│       └── opengraph-image.tsx                   # Dynamic OG card
├── review/[id]/
│   ├── page.tsx                                  # Dedicated supervisor review (/review/:id)
│   ├── loading.tsx                               # Review loading skeleton
│   └── ReviewDetail.tsx                          # Client per-entry approve/reject UI
├── sign-in/[[...sign-in]]/page.tsx               # Clerk Sign-in component wrapper
└── sign-up/[[...sign-up]]/page.tsx               # Clerk Sign-up component wrapper
```

---

## 2. Page Specifications

### A. Root Layout (`app/layout.tsx`)
- **Type**: Server Component.
- **Features**:
  - Configures Geist/Roboto font variables (`--font-roboto-sans`, `--font-roboto-mono`).
  - Wraps entire app in `<ClerkProvider>`.
  - Renders sticky top navigation bar with app logo link, `<SignInButton>` when signed out, and `<UserButton>` + dashboard link when signed in.
  - Mounts `<Toaster richColors />` from `sonner` for application-wide notifications.

### B. Landing Page (`app/page.tsx`)
- **Route**: `/`
- **Type**: Server Component.
- **Logic**: Checks `await auth()`. If authenticated, automatically redirects to `/dashboard`. Otherwise, renders a clean marketing landing view with hero text and `<SignInButton>`.

### C. Dashboard (`app/dashboard/page.tsx`)
- **Route**: `/dashboard`
- **Type**: Server Component (with `loading.tsx` skeleton).
- **Logic**:
  - Ensures authenticated user exists via `auth()` or redirects to `/sign-in`.
  - Upserts user details into `users` table via `CloudDatabase.upsertUser`.
  - Links any pending supervisor timesheets via `CloudDatabase.linkSupervisorByEmail`.
  - Fetches employee timesheets (`getMyTimesheets`) and assigned supervisor timesheets (`getAssignedTimesheets`).
  - Passes data into `<DashboardTabs />` alongside `<CreateTimesheetDialog />`.

### D. Timesheet Detail (`app/timesheets/[id]/page.tsx`)
- **Route**: `/timesheets/:id`
- **Type**: Server Component.
- **Logic**:
  - Authorizes that the current logged-in user is the creator (`employee_user_id === dbUser.id`).
  - Loads timesheet and its entries (`CloudDatabase.getEntriesForTimesheet`).
  - Generates signed share URL using `createTimesheetShareToken(timesheet.id)` (`/timesheets/preview/:token`).
  - Passes data to `<TimesheetDetail />`.

### E. Supervisor Review Page (`app/review/[id]/page.tsx`)
- **Route**: `/review/:id`
- **Type**: Server Component (with `loading.tsx` skeleton).
- **Logic**:
  - Verifies that `dbUser.id === timesheet.supervisor_user_id` or that `dbUser.email === timesheet.supervisor_email`.
  - Automatically links supervisor if unlinked.
  - Loads timesheet and all daily entries.
  - Renders `<ReviewDetail />`.

### F. Shared Preview (`app/timesheets/preview/[token]/page.tsx`)
- **Route**: `/timesheets/preview/:token`
- **Type**: Server Component (Public).
- **Logic**:
  - Cryptographically verifies the HMAC share token via `getTimesheetIdFromShareToken(token)`.
  - If valid, fetches timesheet metadata and renders a clean read-only summary card.
  - Features dynamic OpenGraph images (`opengraph-image.tsx`).
  - Provides a direct link to sign in and open the full timesheet at `/timesheets/share/:id`.

### G. Shared Supervisor View (`app/timesheets/share/[id]/page.tsx`)
- **Route**: `/timesheets/share/:id`
- **Type**: Server Component.
- **Logic**:
  - Requires sign-in (`redirect('/sign-in')`).
  - Authorizes the supervisor and allows one-click batch approval of all entries via `<SharedTimesheetDetail />`.

---

## 3. Interactive Client Components

### 1. `DashboardTabs.tsx`
- **Tabs**: "My Timesheets" (with count badge) and "Assigned To Me" (with count badge).
- **"My Timesheets" Table**:
  - Shows title, date range, status badge (draft/submitted/approved/rejected), supervisor email, and last updated timestamp.
  - Actions:
    - **View**: Links to `/timesheets/:id`.
    - **Submit**: Submits a draft timesheet directly from table with pending spinner.
    - **Delete**: Renders `<DeleteTimesheetDialog />` with an `AlertDialog` confirmation.
- **"Assigned To Me" Table**:
  - Shows employee email, title, date range, status badge.
  - Actions:
    - **Review**: Links to `/review/:id`.

### 2. `CreateTimesheetDialog.tsx`
- Modal dialog triggered by "+ New Timesheet".
- Form fields:
  - `title`: Timesheet title (e.g. "Feb 10 - Feb 16").
  - `startDate`: Date input (`YYYY-MM-DD`).
  - `endDate`: Date input (`YYYY-MM-DD`).
  - `supervisorEmail`: Email input for the designated reviewer.
- Client validation: Ensures `endDate >= startDate`.
- Calls `createTimesheet` Server Action and navigates to the new timesheet upon creation.

### 3. `TimesheetDetail.tsx`
- **Header**: Back link to Dashboard, timesheet title, formatted date range, status pill badge.
- **Context Buttons**:
  - **Share**: Copies `/timesheets/preview/[token]` URL to clipboard with toast notification.
  - **Test Email**: Development-only button to send a sample supervisor email.
  - **Edit**: Triggers `<EditTimesheetDialog />` to change title, supervisor email, or extend end date (if draft).
  - **Submit for Approval**: Submits the timesheet (disabled if entries length is 0 or pending transition).
- **Summary Cards**: Displays supervisor email, employee name, total hours calculated client-side.
- **Entries Table**:
  - Columns: Date, Hours, Description, Approval Status badge, Actions.
  - In draft mode:
    - Includes `<AddEntryDialog />` to add an entry (validates date is within timesheet range and unique).
    - `<EditEntryDialog />` to modify hours and description.
    - "Remove" button to delete entry with immediate optimistic UI update.

### 4. `ReviewDetail.tsx`
- Dedicated view for supervisors to inspect submitted timesheets.
- Displays employee email, date range, total hours, and submission date.
- Status banners for approved or rejected states.
- For each entry, allows the supervisor to independently click:
  - **Approve**: Sets entry to `approved`.
  - **Reject**: Sets entry to `rejected`.
- Triggers automatic timesheet status recalculation once all entries are reviewed.

### 5. `SharedTimesheetDetail.tsx`
- Designed for supervisors who access the timesheet via a shared link.
- Displays summary table of all entries and hours.
- Renders a prominent **"Approve Timesheet"** button that bulk-approves all entries and marks the timesheet approved in a single transition.

---

## 4. Design System & shadcn/ui Components

All UI primitives reside in `components/ui/` and adhere to shadcn/ui conventions:

| Component | File | Usage |
| :--- | :--- | :--- |
| **Button** | `components/ui/button.tsx` | Standard buttons with `variant` (`default`, `outline`, `destructive`, `ghost`) and `size` options. Supports slot delegation via `render`. |
| **Dialog** | `components/ui/dialog.tsx` | Accessible modals for creating timesheets, adding entries, editing entries, and editing timesheets. |
| **AlertDialog** | `components/ui/alert-dialog.tsx` | Confirmation modal for destructive actions (e.g., deleting a timesheet). |
| **Table** | `components/ui/table.tsx` | Responsive tables (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`). |
| **Badge** | `components/ui/badge.tsx` | Status indicators and badge counts on tabs. |
| **Card** | `components/ui/card.tsx` | Content containers for preview cards and summaries. |
| **Input** | `components/ui/input.tsx` | Standard styled HTML text, date, and email inputs. |
| **Textarea** | `components/ui/textarea.tsx` | Multi-line text inputs for entry work descriptions. |
| **Label** | `components/ui/label.tsx` | Form labels associated with inputs via `htmlFor`. |
| **Tabs** | `components/ui/tabs.tsx` | Accessible tab switches (`TabsList`, `TabsTrigger`, `TabsContent`). |
| **Separator** | `components/ui/separator.tsx` | Visual dividing lines separating sections. |
| **Sonner** | `components/ui/sonner.tsx` | `<Toaster />` component for toast alerts. |
