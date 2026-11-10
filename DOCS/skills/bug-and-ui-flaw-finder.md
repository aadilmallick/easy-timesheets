# Skill: Bug & UI/UX Flaw Finder

## Purpose
This skill provides a systematic methodology and evaluation framework for AI agents to audit the application, detect functional bugs, edge cases, security or permission loopholes, visual glitches, accessibility gaps, and UI/UX friction points, highlight them clearly, and propose actionable fixes.

---

## 1. Audit Dimensions

When executing this skill across the codebase, evaluate code and user interfaces along five key dimensions:

### Dimension A: Functional Logic & State Transitions
- **Lifecycle Integrity**:
  - Can draft timesheets be edited after submission?
  - Can users add entries with dates outside the timesheet start and end range?
  - Can duplicate entries be submitted for the same date?
  - What happens if an employee submits a timesheet with zero entries?
  - Does entry approval or rejection properly recalculate the overall timesheet status?
- **Date & Timezone Anomalies**:
  - Are dates formatted using UTC to avoid off-by-one day display bugs across timezones?
  - Is `getDateOnlyValue` applied consistently before date comparisons and inputs?

### Dimension B: Authorization & Access Control
- **IDOR (Insecure Direct Object References)**:
  - Can Employee A edit, view, or delete Employee B's timesheet?
  - Can an arbitrary user approve timesheet entries by calling `approveEntry` with a guessed `timesheetId`?
  - Does the supervisor review view check both `supervisor_user_id` and `supervisor_email`?
- **Public vs. Protected Route Boundaries**:
  - Is `proxy.ts` strictly protecting private routes?
  - Does `/timesheets/preview/[token]` leak sensitive employee PII or allow unauthorized actions?

### Dimension C: Database Safety & Neon Serverless Query Integrity
- **PostgreSQL Parameter Typing**:
  - Are null values in `COALESCE` or `CASE WHEN` properly cast (e.g. `::text`, `::uuid`, `::date`) to avoid Neon/Postgres error `42P18` ("could not determine data type of parameter")?
- **SQL Injection**:
  - Are all queries using Neon's tagged template `sql` literal and parameterized placeholders?
- **Orphan Records**:
  - Are foreign key cascading constraints (`ON DELETE CASCADE`) configured to prevent dangling entries?

### Dimension D: UI/UX Friction & Usability
- **Feedback & Pending States**:
  - Does every user action (Save, Delete, Submit, Approve, Reject) render a disabled or loading state to prevent double-clicks?
  - Are optimistic updates or toast notifications (`sonner`) triggered with clear success/error messages?
- **Destructive Action Guards**:
  - Are destructive actions (like timesheet deletion) protected by confirmation dialogs (`AlertDialog`)?
- **Empty States**:
  - Do tables display informative empty states when no timesheets or entries exist?
- **Input Constraints & Validation**:
  - Do date inputs specify `min` or `max` attributes?
  - Do number inputs specify `min={0.5}`, `max={24}`, and `step="0.5"`?

### Dimension E: Accessibility & Responsive Layout
- **Forms & Inputs**:
  - Does every `<Input>` have an associated `<Label htmlFor="...">`?
- **Responsive Layout**:
  - Do data tables scroll horizontally or wrap cleanly on mobile screens?
  - Do long text descriptions truncate or wrap gracefully without breaking table layout?

---

## 2. Standard Bug & Flaw Report Format

When reporting bugs or UX flaws, agents must structure findings using the following format:

```markdown
### [FLAW-ID]: <Descriptive Title>
- **Category**: [Functional Bug | Authorization | Database / SQL | UI/UX Flaw | Accessibility]
- **Severity**: [Critical | High | Medium | Low]
- **Location**: `<file-path>:<line-number>`
- **Observed Behavior**: What happens currently in the application.
- **Expected / Desired Behavior**: What should happen according to product requirements and UX standards.
- **Steps to Reproduce**:
  1. Step 1
  2. Step 2
- **Suggested Fix**:
  ```diff
  // Clear diff or code snippet demonstrating the fix
  ```
```

---

## 3. Auditing Checklist for Common Flaws in This App

Run through this checklist when auditing the current codebase:

- [ ] **Timesheet Edit End Date Constraint**: Verify that when editing a timesheet, `endDate` cannot be set earlier than `startDate` or changed if already in the past.
- [ ] **Hours Range Validation**: Verify that entries enforce the 0.5 to 24 hour limit in both the client dialog and Zod schema.
- [ ] **Supervisor Auto-Linking**: Verify that when a user logs in, `linkSupervisorByEmail` runs with lower-cased email comparison to link historical assignments.
- [ ] **Share Token Tampering**: Verify that any modified token returns 404/null without throwing an unhandled exception or leaking error stack traces.
- [ ] **Empty Timesheet Submission**: Ensure submission is disabled or blocked if there are 0 logged entries.
- [ ] **Review Recalculation**: Confirm that if 1 entry is rejected and all other entries are approved, the timesheet marks as `rejected`.
