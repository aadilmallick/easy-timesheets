"use client";

import { useQuery } from "@tanstack/react-query";

const TWO_MINUTES_MS = 2 * 60 * 1000;

export function useTimesheetPolling<TData>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: readonly unknown[];
  queryFn: () => Promise<TData>;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [...queryKey],
    queryFn,
    enabled,
    refetchInterval: TWO_MINUTES_MS,
  });
}
