import { ImageResponse } from "next/og";
import { CloudDatabase } from "@/db/CloudDatabase";
import { formatDate } from "@/lib/date";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timesheet = await CloudDatabase.getTimesheetById(id);

  const title = timesheet?.title ?? "Shared Timesheet";
  const supervisor = timesheet?.supervisor_email ?? "Supervisor unavailable";
  const dateRange = timesheet
    ? `${formatDate(timesheet.start_date)} – ${formatDate(timesheet.end_date)}`
    : "Date range unavailable";
  const status = timesheet?.status ?? "shared";

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
            "linear-gradient(135deg, #f8fafc 0%, #dbeafe 45%, #dcfce7 100%)",
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
                backgroundColor: "#2563eb",
              }}
            />
            Easy Timesheets
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 9999,
              backgroundColor: "#ffffffcc",
              padding: "10px 18px",
              fontSize: 24,
              textTransform: "capitalize",
              color: "#334155",
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
            maxWidth: "920px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#334155",
            }}
          >
            Shared with {supervisor}
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
            backgroundColor: "#ffffffd9",
            padding: "22px 28px",
            fontSize: 26,
            color: "#334155",
          }}
        >
          <div style={{ display: "flex" }}>
            Review and approve this shared timesheet.
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            easy-timesheets
          </div>
        </div>
      </div>
    ),
    size
  );
}
