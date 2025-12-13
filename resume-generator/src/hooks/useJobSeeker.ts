"use client";

import { useState, useEffect, useCallback } from "react";
import type { JobSeeker, JobSeekerDetail, JobSeekerListItem, Pagination } from "@/types";

interface UseJobSeekerOptions {
  includeDetails?: boolean;
}

interface UseJobSeekerResult {
  data: JobSeekerDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 単一の求職者データを取得するフック
 */
export function useJobSeeker(
  id: string | undefined,
  options: UseJobSeekerOptions = {}
): UseJobSeekerResult {
  const [data, setData] = useState<JobSeekerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/job-seekers/${id}`);
      if (!res.ok) {
        throw new Error("求職者情報の取得に失敗しました");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseJobSeekersOptions {
  page?: number;
  limit?: number;
  search?: string;
  includeHidden?: boolean;
}

interface UseJobSeekersResult {
  data: JobSeekerListItem[];
  pagination: Pagination;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 求職者一覧を取得するフック
 */
export function useJobSeekers(options: UseJobSeekersOptions = {}): UseJobSeekersResult {
  const { page = 1, limit = 20, search = "", includeHidden = false } = options;

  const [data, setData] = useState<JobSeekerListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(includeHidden && { includeHidden: "true" }),
      });

      const res = await fetch(`/api/job-seekers?${params}`);
      if (!res.ok) {
        throw new Error("求職者一覧の取得に失敗しました");
      }

      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, includeHidden]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, pagination, loading, error, refetch: fetchData };
}









