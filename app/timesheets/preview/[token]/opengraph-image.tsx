import { ImageResponse } from "next/og";
import { CloudDatabase } from "@/db/CloudDatabase";
import { formatDate } from "@/lib/date";
import { getTimesheetIdFromShareToken } from "@/lib/timesheet-share";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const timesheetId = getTimesheetIdFromShareToken(token);
  const timesheet = timesheetId
    ? await CloudDatabase.getTimesheetById(timesheetId)
    : null;

  const supervisor = timesheet?.supervisor_email ?? "Supervisor unavailable";
  const status =
    timesheet?.status === "approved" ? "Approved" : "Not Yet Approved";
  const title = timesheet?.title ?? "Shared Timesheet Preview";
  const dateRange = timesheet
    ? `${formatDate(timesheet.start_date)} – ${formatDate(timesheet.end_date)}`
    : "Date range unavailable";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at top right, #bfdbfe 0%, #eff6ff 36%, #ffffff 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                backgroundColor: "#0f766e",
              }}
            />
            Easy Timesheets
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 9999,
              backgroundColor: "#ecfeff",
              padding: "10px 18px",
              fontSize: 24,
              color: "#0f766e",
            }}
          >
            {status}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "980px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "#334155",
            }}
          >
            Supervisor: {supervisor}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#475569",
            }}
          >
            {dateRange}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderRadius: 28,
            backgroundColor: "#f8fafc",
            padding: "22px 28px",
            fontSize: 26,
            color: "#334155",
          }}
        >
          <div style={{ display: "flex" }}>
            Sign in to review the full shared timesheet.
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            timesheets/preview
          </div>
        </div>
      </div>
    ),
    size
  );
}
