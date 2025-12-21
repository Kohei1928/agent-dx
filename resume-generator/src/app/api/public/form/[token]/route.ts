import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { publicFormSchema, formatZodError } from "@/lib/validations";
import { sendFormSubmissionNotifications } from "@/lib/notifications";

// 通知重複防止用キャッシュ（5分間）
const notificationCache = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5分

function canSendNotification(jobSeekerId: string): boolean {
  const lastSent = notificationCache.get(jobSeekerId);
  const now = Date.now();
  
  if (lastSent && now - lastSent < NOTIFICATION_COOLDOWN_MS) {
    console.log(`⚠️ Notification skipped for ${jobSeekerId}: cooldown active (sent ${Math.round((now - lastSent) / 1000)}s ago)`);
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

// GET: フォームデータ取得（認証不要）
export async function GET(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `form-get:${clientIP}`,
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

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { formToken: token },
      select: {
        id: true,
        name: true,
        resumeData: {
          select: {
            name: true,
            postalCode: true,
            address: true,
            photoUrl: true,
            education: true,
            workHistory: true,
            educationRaw: true,
            workHistoryRaw: true,
          },
        },
        cvData: {
          select: {
            summary: true,
            skillsText: true,
            selfPrTitle: true,
            selfPr: true,
            workHistory: true,
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

    // レジュメデータがあれば返す、なければ名前だけ返す
    // フォーム用の生データを返す（educationRaw, workHistoryRawがあればそれを優先）
    const resumeData = jobSeeker.resumeData as any;
    const cvData = jobSeeker.cvData as any;
    
    // CvDataからworkHistoryを取得（projectsなどが含まれる）
    const cvWorkHistory = cvData?.workHistory || [];
    
    const formData = resumeData ? {
      name: resumeData.name || jobSeeker.name,
      postalCode: resumeData.postalCode || "",
      address: resumeData.address || "",
      photoUrl: resumeData.photoUrl || "",
      education: resumeData.educationRaw || [],
      // CvDataからworkHistoryを優先取得（projectsを含む）
      workHistory: cvWorkHistory.length > 0 ? cvWorkHistory : (resumeData.workHistoryRaw || []),
      // 職務経歴書用フィールド
      summary: cvData?.summary || "",
      skillsText: cvData?.skillsText || "",
      selfPrTitle: cvData?.selfPrTitle || "",
      selfPr: cvData?.selfPr || "",
    } : {
      name: jobSeeker.name,
      postalCode: "",
      address: "",
      photoUrl: "",
      education: [],
      workHistory: cvWorkHistory,
      summary: cvData?.summary || "",
      skillsText: cvData?.skillsText || "",
      selfPrTitle: cvData?.selfPrTitle || "",
      selfPr: cvData?.selfPr || "",
    };

    return NextResponse.json({
      jobSeekerName: jobSeeker.name,
      formData,
    });
  } catch (error) {
    console.error("Failed to fetch form data:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// POST: フォームデータ保存（認証不要）
export async function POST(request: NextRequest, context: Context) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(
      `form-post:${clientIP}`,
      RATE_LIMITS.publicForm
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }

    const params = await context.params;
    const { token } = params;

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

    const body = await request.json();
    
    // バリデーション
    const validationResult = publicFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: formatZodError(validationResult.error) },
        { status: 400 }
      );
    }

    const { name, postalCode, address, education, workHistory, summary, skillsText, selfPrTitle, selfPr } = validationResult.data;
    const isComplete = body.isComplete === true; // 最終送信フラグ（自動保存時はfalse）

    // 新しい学歴フォーマットを履歴書用のフォーマットに変換
    // 入学と卒業を別々のエントリとして生成
    const resumeEducation: Array<{ year: string; month: string; content: string }> = [];
    (education || []).forEach((edu: any) => {
      const schoolName = edu.schoolName || "";
      const faculty = edu.faculty ? ` ${edu.faculty}` : "";
      const fullName = `${schoolName}${faculty}`;
      const status = edu.status || (edu.isAttending ? "attending" : "graduated");

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
        // 在学中
        resumeEducation.push({
          year: "",
          month: "",
          content: `${fullName} 在学中`,
        });
      } else if (status === "dropped_out") {
        // 中退
        if (edu.graduationYear && edu.graduationMonth) {
          resumeEducation.push({
            year: edu.graduationYear,
            month: edu.graduationMonth,
            content: `${fullName} 中退`,
          });
        } else {
          resumeEducation.push({
            year: "",
            month: "",
            content: `${fullName} 中退`,
          });
        }
      } else {
        // 卒業
        if (edu.graduationYear && edu.graduationMonth) {
          resumeEducation.push({
            year: edu.graduationYear,
            month: edu.graduationMonth,
            content: `${fullName} 卒業`,
          });
        }
      }
    });

    // 職歴を履歴書用のフォーマットに変換
    const resumeWorkHistory: Array<{ year: string; month: string; content: string }> = [];
    (workHistory || []).forEach((work: any) => {
      const companyName = work.companyName || "";

      // 入社
      if (work.startYear && work.startMonth) {
        resumeWorkHistory.push({
          year: work.startYear,
          month: work.startMonth,
          content: `${companyName} 入社`,
        });
      }

      // 退社（現職でなければ）
      if (!work.isCurrentJob && work.endYear && work.endMonth) {
        resumeWorkHistory.push({
          year: work.endYear,
          month: work.endMonth,
          content: `${companyName} 退社`,
        });
      } else if (work.isCurrentJob) {
        resumeWorkHistory.push({
          year: "",
          month: "",
          content: `${companyName} 在職中`,
        });
      }
    });

    // ResumeDataを更新または作成（履歴書用）
    // education/workHistoryは履歴書用フォーマット、educationRaw/workHistoryRawはフォーム再編集用
    await prisma.resumeData.upsert({
      where: { jobSeekerId: jobSeeker.id },
      update: {
        name: name || jobSeeker.name,
        postalCode: postalCode || null,
        address: address || null,
        education: resumeEducation,
        workHistory: resumeWorkHistory,
        educationRaw: education || [],
        workHistoryRaw: workHistory || [],
      },
      create: {
        jobSeekerId: jobSeeker.id,
        name: name || jobSeeker.name,
        postalCode: postalCode || null,
        address: address || null,
        education: resumeEducation,
        workHistory: resumeWorkHistory,
        educationRaw: education || [],
        workHistoryRaw: workHistory || [],
      },
    });

    // CvDataも更新または作成（職務経歴書用）
    // フォームの職歴データをCvData用に変換
    console.log("Received workHistory from form:", JSON.stringify(workHistory, null, 2));
    
    const cvWorkHistory = (workHistory || []).map((w: any) => ({
      companyName: w.companyName || "",
      businessContent: w.businessContent || "",
      established: "",
      capital: "",
      employees: "",
      startYear: w.startYear || "",
      startMonth: w.startMonth || "",
      endYear: w.endYear || "",
      endMonth: w.endMonth || "",
      isCurrentJob: w.isCurrentJob || false,
      period: w.isCurrentJob 
        ? `${w.startYear || ""}年${w.startMonth || ""}月〜現在`
        : `${w.startYear || ""}年${w.startMonth || ""}月〜${w.endYear || ""}年${w.endMonth || ""}月`,
      // 業務セット（projects）を保存
      projects: (w.projects || []).map((p: any) => ({
        id: p.id || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startYear: p.startYear || "",
        startMonth: p.startMonth || "",
        endYear: p.endYear || "",
        endMonth: p.endMonth || "",
        isCurrentJob: p.isCurrentJob || false,
        content: p.content || "",
        achievements: p.achievements || "",
        initiatives: p.initiatives || "",
      })),
      // 後方互換性のため単一フィールドも保持
      content: w.content || "",
      achievements: w.achievements || "",
      initiatives: w.initiatives || "",
    }));

    console.log("Saving cvWorkHistory to CvData:", JSON.stringify(cvWorkHistory, null, 2));
    
    await prisma.cvData.upsert({
      where: { jobSeekerId: jobSeeker.id },
      update: {
        workHistory: cvWorkHistory,
        summary: summary || undefined,
        skillsText: skillsText || undefined,
        selfPrTitle: selfPrTitle || undefined,
        selfPr: selfPr || undefined,
      },
      create: {
        jobSeekerId: jobSeeker.id,
        workHistory: cvWorkHistory,
        summary: summary || undefined,
        skillsText: skillsText || undefined,
        selfPrTitle: selfPrTitle || undefined,
        selfPr: selfPr || undefined,
      },
    });

    // JobSeekerの名前も更新
    if (name && name !== jobSeeker.name) {
      await prisma.jobSeeker.update({
        where: { id: jobSeeker.id },
        data: { name },
      });
    }

    // 通知送信（最終送信時のみ、非同期で実行、エラーは無視、重複防止）
    if (isComplete && canSendNotification(jobSeeker.id)) {
      const baseUrl = process.env.NEXTAUTH_URL || request.headers.get("origin") || "";
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
    console.error("Failed to save form data:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "エラーが発生しました" },
      { status: 500 }
    );
  }
}

