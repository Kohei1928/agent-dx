import { google } from "googleapis";

interface VideoData {
  title: string;
  url: string;
  views: number;
  likes: number;
  authorName: string;
  postedAt: Date;
  thumbnailUrl: string | null;
  musicName: string | null;
}

export async function exportToGoogleSheets(
  videos: VideoData[],
  spreadsheetId?: string | null
): Promise<{ spreadsheetId: string; sheetUrl: string }> {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("Google Sheets credentials are not configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD形式

  let targetSpreadsheetId = spreadsheetId;

  // スプレッドシートIDが指定されていない場合は新規作成
  if (!targetSpreadsheetId) {
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `TikTok Trend Collector - ${today}`,
        },
        sheets: [
          {
            properties: {
              title: today,
            },
          },
        ],
      },
    });

    targetSpreadsheetId = spreadsheet.data.spreadsheetId!;
  } else {
    // 既存のスプレッドシートに新しいシートを追加
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: targetSpreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: today,
                },
              },
            },
          ],
        },
      });
    } catch (error: unknown) {
      // シートが既に存在する場合は日時を付けて作成
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: targetSpreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: `${today}_${timestamp}`,
                  },
                },
              },
            ],
          },
        });
      } else {
        throw error;
      }
    }
  }

  // ヘッダー行
  const headers = [
    "順位",
    "動画タイトル",
    "動画URL",
    "再生回数",
    "いいね数",
    "投稿者名",
    "投稿日",
    "サムネイルURL",
    "使用楽曲",
  ];

  // データ行
  const rows = videos.map((video, index) => [
    index + 1,
    video.title,
    video.url,
    video.views,
    video.likes,
    `@${video.authorName}`,
    video.postedAt.toISOString().split("T")[0],
    video.thumbnailUrl || "",
    video.musicName || "",
  ]);

  // データを書き込む
  await sheets.spreadsheets.values.update({
    spreadsheetId: targetSpreadsheetId,
    range: `${today}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  // ヘッダー行のスタイルを設定
  const spreadsheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: targetSpreadsheetId,
  });

  const sheetId = spreadsheetInfo.data.sheets?.find(
    (sheet) => sheet.properties?.title === today
  )?.properties?.sheetId;

  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: targetSpreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2,
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1,
                    },
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 9,
              },
            },
          },
        ],
      },
    });
  }

  return {
    spreadsheetId: targetSpreadsheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`,
  };
}















