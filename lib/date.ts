const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function getDateOnlyValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof value !== "string") {
    return String(value);
  }

  return value.split("T")[0] ?? value;
}

export function formatDate(value: string | Date | null | undefined) {
  const normalized = getDateOnlyValue(value);
  const [year, month, day] = normalized.split("-").map(Number);

  if (!year || !month || !day) {
    return normalized;
  }

  return dateFormatter.format(new Date(year, month - 1, day));
}

export function isDateWithinRange(
  value: string | Date | null | undefined,
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const normalized = getDateOnlyValue(value);
  const normalizedStart = getDateOnlyValue(startDate);
  const normalizedEnd = getDateOnlyValue(endDate);

  return normalized >= normalizedStart && normalized <= normalizedEnd;
}

export function isValidCalendarDate(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
