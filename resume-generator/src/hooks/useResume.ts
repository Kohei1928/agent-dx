"use client";

import { useState, useEffect, useCallback } from "react";
import type { ResumeData, CvData, DEFAULT_RESUME_DATA, DEFAULT_CV_DATA } from "@/types";

interface UseResumeResult {
  resumeData: ResumeData;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  cvData: CvData;
  setCvData: React.Dispatch<React.SetStateAction<CvData>>;
  loading: boolean;
  error: Error | null;
  saving: boolean;
  saveResume: () => Promise<boolean>;
  saveCv: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

const defaultResumeData: ResumeData = {
  name: "",
  nameKana: "",
  gender: "",
  birthDate: "",
  postalCode: "",
  address: "",
  addressKana: "",
  phone: "",
  email: "",
  photoUrl: "",
  education: [],
  workHistory: [],
  qualifications: [],
  motivation: "",
  preferences: "",
};

const defaultCvData: CvData = {
  name: "",
  createdDate: new Date().toISOString().split("T")[0],
  summary: "",
  workHistory: [],
  skills: [],
  skillsText: "",
  selfPrTitle: "",
  selfPr: "",
};

/**
 * 履歴書・職務経歴書データを管理するフック
 */
export function useResume(jobSeekerId: string | undefined): UseResumeResult {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [cvData, setCvData] = useState<CvData>(defaultCvData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!jobSeekerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [resumeRes, cvRes] = await Promise.all([
        fetch(`/api/job-seekers/${jobSeekerId}/resume`),
        fetch(`/api/job-seekers/${jobSeekerId}/cv`),
      ]);

      if (resumeRes.ok) {
        const data = await resumeRes.json();
        setResumeData({
          name: data.name || "",
          nameKana: data.nameKana || "",
          gender: data.gender || "",
          birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
          postalCode: data.postalCode || "",
          address: data.address || "",
          addressKana: data.addressKana || "",
          phone: data.phone || "",
          email: data.email || "",
          photoUrl: data.photoUrl || "",
          education: data.education || [],
          workHistory: data.workHistory || [],
          qualifications: data.qualifications || [],
          motivation: data.motivation || "",
          preferences: data.preferences || "",
        });
      }

      if (cvRes.ok) {
        const data = await cvRes.json();
        setCvData({
          name: data.name || "",
          createdDate: data.createdDate
            ? data.createdDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
          summary: data.summary || "",
          workHistory: data.workHistory || [],
          skills: data.skills || [],
          skillsText: data.skillsText || "",
          selfPrTitle: data.selfPrTitle || "",
          selfPr: data.selfPr || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [jobSeekerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveResume = useCallback(async (): Promise<boolean> => {
    if (!jobSeekerId) return false;

    setSaving(true);
    try {
      const res = await fetch(`/api/job-seekers/${jobSeekerId}/resume`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeData),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [jobSeekerId, resumeData]);

  const saveCv = useCallback(async (): Promise<boolean> => {
    if (!jobSeekerId) return false;

    setSaving(true);
    try {
      const res = await fetch(`/api/job-seekers/${jobSeekerId}/cv`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cvData),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [jobSeekerId, cvData]);

  return {
    resumeData,
    setResumeData,
    cvData,
    setCvData,
    loading,
    error,
    saving,
    saveResume,
    saveCv,
    refetch: fetchData,
  };
}


