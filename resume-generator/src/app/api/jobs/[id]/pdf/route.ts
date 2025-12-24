import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdf } from "@react-pdf/renderer";
import React from "react";

// JobSheetPDFコンポーネントをインポート
import { JobSheetPDF } from "@/components/pdf/JobSheetPDF";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 求人データを取得
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // PDFデータを整形
    const pdfData = {
      id: job.id,
      title: job.title,
      jobCode: job.jobCode,
      category: job.category,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryNote: job.salaryNote,
      locations: job.locations as { area: string; detail?: string; note?: string }[] | null,
      remoteWork: job.remoteWork,
      description: job.description,
      highlights: job.highlights,
      experience: job.experience,
      requirements: job.requirements,
      preferences: job.preferences,
      department: job.department,
      employmentType: job.employmentType,
      workHours: job.workHours,
      overtimeHours: job.overtimeHours,
      shortTime: job.shortTime,
      selectionFlow: job.selectionFlow,
      selectionDetail: job.selectionDetail,
      probation: job.probation,
      probationDetail: job.probationDetail,
      benefits: job.benefits,
      annualHolidays: job.annualHolidays,
      holidays: job.holidays,
      welfare: job.welfare,
      smoking: job.smoking,
      smokingDetail: job.smokingDetail,
      company: {
        name: job.company.name,
        headquarters: job.company.headquarters,
        industry: job.company.industry,
        employeeCount: job.company.employeeCount,
        foundedDate: job.company.foundedDate,
        overview: job.company.overview,
        business: job.company.business,
      },
    };

    // PDFをバッファとして生成
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfDocument = pdf(React.createElement(JobSheetPDF, { data: pdfData }) as any);
    const pdfBlob = await pdfDocument.toBlob();
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // ファイル名を生成（日本語対応）
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `求人票_${job.company.name}_${job.title}_${timestamp}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    // レスポンスを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

