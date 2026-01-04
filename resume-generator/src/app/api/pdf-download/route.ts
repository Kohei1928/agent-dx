import { NextRequest, NextResponse } from "next/server";

/**
 * PDFダウンロードAPI
 * クライアントからBase64エンコードされたPDFを受け取り、
 * Content-Dispositionヘッダー付きで返すことで正しいファイル名でダウンロードさせる
 */
export async function POST(request: NextRequest) {
  try {
    const { pdfBase64, fileName } = await request.json();

    if (!pdfBase64 || !fileName) {
      return NextResponse.json(
        { error: "pdfBase64 and fileName are required" },
        { status: 400 }
      );
    }

    // Base64をバイナリに変換
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Content-Dispositionヘッダーでファイル名を指定
    // RFC 5987に従ってUTF-8ファイル名をエンコード
    const encodedFileName = encodeURIComponent(fileName).replace(/'/g, "%27");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF download error:", error);
    return NextResponse.json(
      { error: "PDFのダウンロードに失敗しました" },
      { status: 500 }
    );
  }
}

