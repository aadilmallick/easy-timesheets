import { createHmac, timingSafeEqual } from "node:crypto";

const shareSecret =
  process.env.TIMESHEET_SHARE_SECRET ??
  process.env.CLERK_SECRET_KEY ??
  process.env.DATABASE_URL ??
  "easy-timesheets-share-secret";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signTimesheetId(timesheetId: string) {
  return createHmac("sha256", shareSecret)
    .update(timesheetId)
    .digest("base64url");
}

export function createTimesheetShareToken(timesheetId: string) {
  return `${timesheetId}.${signTimesheetId(timesheetId)}`;
}

export function getTimesheetIdFromShareToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [timesheetId, signature] = parts;
  if (!timesheetId || !signature || !uuidPattern.test(timesheetId)) {
    return null;
  }

  const expectedSignature = signTimesheetId(timesheetId);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(provided, expected)) {
    return null;
  }

  return timesheetId;
}
