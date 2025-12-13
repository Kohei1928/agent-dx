"use client";

import { useState, useEffect, useCallback } from "react";
import type { Schedule, ScheduleBooking, CreateScheduleInput } from "@/types";

interface UseSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: Error | null;
  addSchedule: (schedule: CreateScheduleInput) => Promise<boolean>;
  addSchedulesBulk: (schedules: CreateScheduleInput[]) => Promise<boolean>;
  cancelSchedule: (scheduleId: string) => Promise<boolean>;
  cancelBooking: (scheduleId: string, reason?: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * 日程データを管理するフック
 */
export function useSchedules(jobSeekerId: string | undefined): UseSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!jobSeekerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/job-seekers/${jobSeekerId}/schedules`);
      if (!res.ok) {
        throw new Error("日程の取得に失敗しました");
      }
      const json = await res.json();
      setSchedules(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [jobSeekerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addSchedule = useCallback(
    async (schedule: CreateScheduleInput): Promise<boolean> => {
      if (!jobSeekerId) return false;

      try {
        const res = await fetch(`/api/job-seekers/${jobSeekerId}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedule),
        });

        if (res.ok) {
          await fetchData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [jobSeekerId, fetchData]
  );

  const addSchedulesBulk = useCallback(
    async (newSchedules: CreateScheduleInput[]): Promise<boolean> => {
      if (!jobSeekerId) return false;

      try {
        const res = await fetch(`/api/job-seekers/${jobSeekerId}/schedules/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedules: newSchedules }),
        });

        if (res.ok) {
          await fetchData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [jobSeekerId, fetchData]
  );

  const cancelSchedule = useCallback(
    async (scheduleId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}/cancel`, {
          method: "POST",
        });

        if (res.ok) {
          await fetchData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [fetchData]
  );

  const cancelBooking = useCallback(
    async (scheduleId: string, reason?: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}/cancel-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (res.ok) {
          await fetchData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [fetchData]
  );

  return {
    schedules,
    loading,
    error,
    addSchedule,
    addSchedulesBulk,
    cancelSchedule,
    cancelBooking,
    refetch: fetchData,
  };
}









