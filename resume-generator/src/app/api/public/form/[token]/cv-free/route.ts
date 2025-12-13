import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { sendFormSubmissionNotifications } from "@/lib/notifications";

// 通知重複防止用キャッシュ（5分間）
const notificationCache = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5分

function canSendNotification(jobSeekerId: string): boolean {
  const lastSent = notificationCache.get(jobSeekerId);
  const now = Date.now();
  
  if (lastSent && now - lastSent < NOTIFICATION_COOLDOWN_MS) {
    console.log(`⚠️ CV-Free notification skipped for ${jobSeekerId}: cooldown active (sent ${Math.round((now - lastSent) / 1000)}s ago)`);
    return false;
  }
  
  notificationCache.set(jobSeekerId, now);
  
  // 古いエントリをクリーンアップ（メモリリーク防止）
  for (const [key, timestamp] of notificationCache.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN_MS) {
      notificationCache.delete(key);
    }
  }
  
  return true;
}

type Context = {
  params: Promise<{ token: string }>;
};

// GET: 自由記述Ver用フォームデータ取得（認証不要）
export async function GET(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `cv-free-get:${clientIP}`,
      RATE_LIMITS.publicScheduleView
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "リクエストが多すぎます" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;

    // JobSeekerを取得（cvDataリレーションは使わない）
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { formToken: token },
      select: {
        id: true,
        name: true,
        resumeData: {
          select: {
            postalCode: true,
            address: true,
            photoUrl: true,
            educationRaw: true,
          },
        },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "URLが無効です" },
        { status: 404 }
      );
    }

    // CvDataを別クエリで取得（存在しないフィールドを避ける）
    let cvData: { name: string | null; workHistory: any } | null = null;
    try {
      cvData = await prisma.cvData.findUnique({
        where: { jobSeekerId: jobSeeker.id },
        select: {
          name: true,
          workHistory: true,
        },
      });
    } catch (e) {
      console.error("Error fetching cvData:", e);
    }

    const workHistory = cvData?.workHistory || [];
    const resumeData = jobSeeker.resumeData as any;
    
    // workHistoryから自由記述Ver用のデータを抽出
    const formWorkHistory = Array.isArray(workHistory) ? workHistory.map((w: any) => ({
      companyName: w.companyName || "",
      startYear: w.startYear || "",
      startMonth: w.startMonth || "",
      endYear: w.endYear || "",
      endMonth: w.endMonth || "",
      isCurrentJob: w.isCurrentJob || false,
      businessContent: w.businessContent || "",
      established: w.established || "",
      capital: w.capital || "",
      employees: w.employees || "",
      freeformContent: w.freeformContent || "",
    })) : [];

    const formData = {
      name: cvData?.name || jobSeeker.name,
      postalCode: resumeData?.postalCode || "",
      address: resumeData?.address || "",
      photoUrl: resumeData?.photoUrl || "",
      education: resumeData?.educationRaw || [],
      workHistory: formWorkHistory.length > 0 ? formWorkHistory : [],
      freeformSkills: "",
    };

    return NextResponse.json({
      jobSeekerName: jobSeeker.name,
      formData,
    });
  } catch (error) {
    console.error("Failed to fetch cv-free form data:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// POST: 自由記述Ver用フォームデータ保存（認証不要）
export async function POST(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `cv-free-post:${clientIP}`,
      RATE_LIMITS.publicForm
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "リクエストが多すぎます" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;
    const body = await request.json();

    const { name, postalCode, address, education, workHistory, isComplete } = body;

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { formToken: token },
      select: {
        id: true,
        name: true,
        registeredBy: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!jobSeeker) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "URLが無効です" },
        { status: 404 }
      );
    }

    // 既存のCvDataを取得
    let existingCvData: { workHistory: any } | null = null;
    try {
      existingCvData = await prisma.cvData.findUnique({
        where: { jobSeekerId: jobSeeker.id },
        select: {
          workHistory: true,
        },
      });
    } catch (e) {
      console.error("Error fetching existing cvData:", e);
    }

    const existingWorkHistory = Array.isArray(existingCvData?.workHistory) 
      ? existingCvData.workHistory 
      : [];
    
    // フォームから送信されたworkHistoryを既存データにマージ
    const mergedWorkHistory = (workHistory || []).map((formWork: any, index: number) => {
      const existingWork = existingWorkHistory[index] || {};
      return {
        ...existingWork,
        companyName: formWork.companyName || existingWork.companyName || "",
        startYear: formWork.startYear || existingWork.startYear || "",
        startMonth: formWork.startMonth || existingWork.startMonth || "",
        endYear: formWork.endYear || existingWork.endYear || "",
        endMonth: formWork.endMonth || existingWork.endMonth || "",
        isCurrentJob: formWork.isCurrentJob ?? existingWork.isCurrentJob ?? false,
        businessContent: formWork.businessContent || existingWork.businessContent || "",
        established: formWork.established || existingWork.established || "",
        capital: formWork.capital || existingWork.capital || "",
        employees: formWork.employees || existingWork.employees || "",
        freeformContent: formWork.freeformContent ?? existingWork.freeformContent ?? "",
        content: existingWork.content || "",
        achievements: existingWork.achievements || "",
        initiatives: existingWork.initiatives || "",
        period: formWork.isCurrentJob 
          ? `${formWork.startYear || ""}年${formWork.startMonth || ""}月〜現在`
          : `${formWork.startYear || ""}年${formWork.startMonth || ""}月〜${formWork.endYear || ""}年${formWork.endMonth || ""}月`,
      };
    });

    // CvDataを更新または作成
    await prisma.cvData.upsert({
      where: { jobSeekerId: jobSeeker.id },
      update: {
        name: name || undefined,
        workHistory: mergedWorkHistory,
      },
      create: {
        jobSeekerId: jobSeeker.id,
        name: name || jobSeeker.name,
        workHistory: mergedWorkHistory,
      },
    });

    // 学歴を履歴書用のフォーマットに変換
    const resumeEducation: Array<{ year: string; month: string; content: string }> = [];
    (education || []).forEach((edu: any) => {
      const schoolName = edu.schoolName || "";
      const faculty = edu.faculty ? ` ${edu.faculty}` : "";
      const fullName = `${schoolName}${faculty}`;
      const status = edu.status || "graduated";

      // 入学
      if (edu.entranceYear && edu.entranceMonth) {
        resumeEducation.push({
          year: edu.entranceYear,
          month: edu.entranceMonth,
          content: `${fullName} 入学`,
        });
      }

      // ステータスに応じた処理
      if (status === "attending") {
        resumeEducation.push({
          year: "",
          month: "",
          content: `${fullName} 在学中`,
        });
      } else if (status === "dropped_out") {
        if (edu.graduationYear && edu.graduationMonth) {
          resumeEducation.push({
            year: edu.graduationYear,
            month: edu.graduationMonth,
            content: `${fullName} 中退`,
          });
        }
      } else {
        if (edu.graduationYear && edu.graduationMonth) {
          resumeEducation.push({
            year: edu.graduationYear,
            month: edu.graduationMonth,
            content: `${fullName} 卒業`,
          });
        }
      }
    });

    // ResumeDataを更新または作成（基本情報用）
    await prisma.resumeData.upsert({
      where: { jobSeekerId: jobSeeker.id },
      update: {
        name: name || undefined,
        postalCode: postalCode || undefined,
        address: address || undefined,
        education: resumeEducation,
        educationRaw: education || [],
      },
      create: {
        jobSeekerId: jobSeeker.id,
        name: name || jobSeeker.name,
        postalCode: postalCode || null,
        address: address || null,
        education: resumeEducation,
        educationRaw: education || [],
      },
    });

    // JobSeekerの名前も更新
    if (name && name !== jobSeeker.name) {
      await prisma.jobSeeker.update({
        where: { id: jobSeeker.id },
        data: { name },
      });
    }

    // 完了通知（重複防止）
    if (isComplete && canSendNotification(jobSeeker.id)) {
      const baseUrl = request.headers.get("origin") || process.env.NEXTAUTH_URL || "";
      sendFormSubmissionNotifications({
        candidateName: name || jobSeeker.name,
        userEmail: jobSeeker.registeredBy?.email || undefined,
        submittedAt: new Date(),
        formUrl: `${baseUrl}/job-seekers/${jobSeeker.id}`,
      }).catch((err) => {
        console.error("Form notification error (non-fatal):", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: isComplete ? "フォームを送信しました" : "保存しました",
    });
  } catch (error) {
    console.error("Failed to save cv-free form data:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "エラーが発生しました" },
      { status: 500 }
    );
  }
}
