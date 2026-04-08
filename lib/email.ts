import { Resend } from "resend";
import { formatDate } from "@/lib/date";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const resendEmail = "team@aadilmallick.com";

export async function sendTimesheetSubmittedEmail(params: {
  supervisorEmail: string;
  employeeName: string;
  timesheetTitle: string;
  startDate: string;
  endDate: string;
  timesheetId: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/review/${params.timesheetId}`;

  const formattedStart = formatDate(params.startDate);
  const formattedEnd = formatDate(params.endDate);

  await resend.emails.send({
    from: `Timesheets <${resendEmail}>`,
    to: params.supervisorEmail,
    subject: "Timesheet Submitted for Approval",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">Timesheet Submitted for Approval</h2>
        <p>${params.employeeName} submitted a timesheet for your approval.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Timesheet</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.timesheetTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Dates</td>
            <td style="padding: 8px 0;">${formattedStart} – ${formattedEnd}</td>
          </tr>
        </table>
        <a href="${reviewUrl}" style="
          display: inline-block;
          background: #000;
          color: #fff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        ">Review Timesheet</a>
      </div>
    `,
  });
}
