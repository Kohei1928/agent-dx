/**
 * APIクライアント
 * フロントエンドからAPIを呼び出すための統一的なインターフェース
 */

import type {
  JobSeeker,
  JobSeekerListItem,
  JobSeekerListResponse,
  CreateJobSeekerInput,
  UpdateJobSeekerInput,
  ResumeData,
  CvData,
  Schedule,
  CreateScheduleInput,
} from "@/types";

/** APIエラークラス */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 求職者一覧取得パラメータ */
interface JobSeekerListParams {
  page?: number;
  limit?: number;
  search?: string;
  includeHidden?: boolean;
}

/** 推薦文テンプレート */
interface RecommendationTemplate {
  id: string;
  jobType: string;
  points: string;
  example: string;
  createdAt: string;
  updatedAt: string;
}

/** 推薦文 */
interface Recommendation {
  id: string;
  jobSeekerId: string;
  templateId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * APIクライアントクラス
 */
class ApiClient {
  /**
   * 共通リクエストメソッド
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        res.status,
        errorBody.code || "API_ERROR",
        errorBody.error || errorBody.message || "エラーが発生しました"
      );
    }

    // 204 No Content の場合は空オブジェクトを返す
    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  /**
   * 求職者API
   */
  jobSeekers = {
    /** 一覧取得 */
    list: async (params?: JobSeekerListParams): Promise<JobSeekerListResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.search) searchParams.set("search", params.search);
      if (params?.includeHidden) searchParams.set("includeHidden", "true");

      const query = searchParams.toString();
      return this.request<JobSeekerListResponse>(
        `/api/job-seekers${query ? `?${query}` : ""}`
      );
    },

    /** 詳細取得 */
    get: (id: string) => this.request<JobSeeker>(`/api/job-seekers/${id}`),

    /** 作成 */
    create: (data: CreateJobSeekerInput) =>
      this.request<JobSeeker>("/api/job-seekers", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    /** 更新 */
    update: (id: string, data: UpdateJobSeekerInput) =>
      this.request<JobSeeker>(`/api/job-seekers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    /** 削除 */
    delete: (id: string) =>
      this.request<void>(`/api/job-seekers/${id}`, { method: "DELETE" }),

    /** 一括削除 */
    bulkDelete: (ids: string[]) =>
      this.request<void>("/api/job-seekers/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    /** 一括非表示/表示 */
    bulkHide: (ids: string[], hide: boolean) =>
      this.request<void>("/api/job-seekers/bulk-hide", {
        method: "PUT",
        body: JSON.stringify({ ids, hide }),
      }),
  };

  /**
   * 履歴書API
   */
  resume = {
    /** 取得 */
    get: (jobSeekerId: string) =>
      this.request<ResumeData>(`/api/job-seekers/${jobSeekerId}/resume`),

    /** 保存 */
    save: (jobSeekerId: string, data: ResumeData) =>
      this.request<ResumeData>(`/api/job-seekers/${jobSeekerId}/resume`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  };

  /**
   * 職務経歴書API
   */
  cv = {
    /** 取得 */
    get: (jobSeekerId: string) =>
      this.request<CvData>(`/api/job-seekers/${jobSeekerId}/cv`),

    /** 保存 */
    save: (jobSeekerId: string, data: CvData) =>
      this.request<CvData>(`/api/job-seekers/${jobSeekerId}/cv`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  };

  /**
   * 日程API
   */
  schedules = {
    /** 一覧取得 */
    list: (jobSeekerId: string) =>
      this.request<Schedule[]>(`/api/job-seekers/${jobSeekerId}/schedules`),

    /** 追加 */
    add: (jobSeekerId: string, schedule: CreateScheduleInput) =>
      this.request<Schedule>(`/api/job-seekers/${jobSeekerId}/schedules`, {
        method: "POST",
        body: JSON.stringify(schedule),
      }),

    /** 一括追加 */
    addBulk: (jobSeekerId: string, schedules: CreateScheduleInput[]) =>
      this.request<Schedule[]>(`/api/job-seekers/${jobSeekerId}/schedules/bulk`, {
        method: "POST",
        body: JSON.stringify({ schedules }),
      }),

    /** キャンセル */
    cancel: (scheduleId: string) =>
      this.request<void>(`/api/schedules/${scheduleId}/cancel`, { method: "POST" }),

    /** 予約キャンセル */
    cancelBooking: (scheduleId: string, reason?: string) =>
      this.request<void>(`/api/schedules/${scheduleId}/cancel-booking`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  };

  /**
   * 推薦文テンプレートAPI
   */
  recommendationTemplates = {
    /** 一覧取得 */
    list: () => this.request<RecommendationTemplate[]>("/api/recommendation-templates"),

    /** 作成 */
    create: (data: { jobType: string; points: string; example: string }) =>
      this.request<RecommendationTemplate>("/api/recommendation-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    /** 更新 */
    update: (id: string, data: { jobType?: string; points?: string; example?: string }) =>
      this.request<RecommendationTemplate>(`/api/recommendation-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    /** 削除 */
    delete: (id: string) =>
      this.request<void>(`/api/recommendation-templates/${id}`, { method: "DELETE" }),
  };

  /**
   * 推薦文API
   */
  recommendation = {
    /** 取得 */
    get: (jobSeekerId: string) =>
      this.request<Recommendation>(`/api/job-seekers/${jobSeekerId}/recommendation`),

    /** 生成 */
    generate: (jobSeekerId: string, templateId: string) =>
      this.request<{ content: string }>(`/api/job-seekers/${jobSeekerId}/recommendation/generate`, {
        method: "POST",
        body: JSON.stringify({ templateId }),
      }),

    /** 改善 */
    refine: (jobSeekerId: string, content: string, instruction: string) =>
      this.request<{ content: string }>(`/api/job-seekers/${jobSeekerId}/recommendation/refine`, {
        method: "POST",
        body: JSON.stringify({ content, instruction }),
      }),

    /** 保存 */
    save: (jobSeekerId: string, templateId: string, content: string) =>
      this.request<Recommendation>(`/api/job-seekers/${jobSeekerId}/recommendation`, {
        method: "PUT",
        body: JSON.stringify({ templateId, content }),
      }),
  };

  /**
   * AI生成API
   */
  generate = {
    /** 履歴書・職務経歴書生成 */
    documents: (jobSeekerId: string) =>
      this.request<{ resume: ResumeData; cv: CvData }>(`/api/job-seekers/${jobSeekerId}/generate`, {
        method: "POST",
      }),
  };

  /**
   * HubSpot API
   */
  hubspot = {
    /** コンタクト検索 */
    searchContacts: (query: string) =>
      this.request<any[]>(`/api/hubspot/contacts/search?q=${encodeURIComponent(query)}`),

    /** プロパティ取得 */
    getProperties: () => this.request<any[]>("/api/hubspot/properties"),

    /** マッピング取得 */
    getMappings: () => this.request<any[]>("/api/hubspot/mappings"),

    /** マッピング保存 */
    saveMappings: (mappings: any[]) =>
      this.request<any[]>("/api/hubspot/mappings", {
        method: "PUT",
        body: JSON.stringify({ mappings }),
      }),

    /** 同期 */
    sync: (jobSeekerId: string) =>
      this.request<void>(`/api/job-seekers/${jobSeekerId}/hubspot/sync`, { method: "POST" }),
  };
}

/** シングルトンインスタンス */
export const api = new ApiClient();









