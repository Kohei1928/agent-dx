import { google } from "googleapis";

// OAuth2クライアントの初期化（リフレッシュトークン対応）
export async function getOAuth2ClientWithRefresh(
  accessToken: string,
  refreshToken?: string | null
): Promise<{ auth: any; newAccessToken?: string }> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
  });

  // トークンの有効性を確認し、必要に応じてリフレッシュ
  if (refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      return { 
        auth: oauth2Client, 
        newAccessToken: credentials.access_token || undefined 
      };
    } catch (e) {
      console.warn("Token refresh failed, using existing token:", e);
    }
  }

  return { auth: oauth2Client };
}

// 履歴書用のGoogleドキュメントを作成
export async function createResumeDocument(
  accessToken: string,
  data: {
    name: string;
    nameKana?: string;
    birthDate?: string;
    address?: string;
    phone?: string;
    email?: string;
    education?: Array<{ year: string; content: string }>;
    workHistory?: Array<{ year: string; company: string; content: string }>;
    qualifications?: Array<{ year: string; name: string }>;
    skills?: string[];
    motivation?: string;
    selfPR?: string;
  },
  refreshToken?: string | null
) {
  const { auth, newAccessToken } = await getOAuth2ClientWithRefresh(accessToken, refreshToken);
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const title = `履歴書_${data.name || "名前未設定"}_${timestamp}`;

  console.log("Creating resume document:", title);

  // ドキュメント作成
  const doc = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const documentId = doc.data.documentId!;
  console.log("Document created with ID:", documentId);

  // ドキュメントにコンテンツを追加
  const requests: any[] = [];
  let index = 1;

  // タイトル
  requests.push({
    insertText: {
      location: { index },
      text: "履 歴 書\n\n",
    },
  });
  index += 8;

  // 基本情報
  const basicInfo = `【氏名】${data.name || ""}
【ふりがな】${data.nameKana || ""}
【生年月日】${data.birthDate || ""}
【住所】${data.address || ""}
【電話番号】${data.phone || ""}
【メールアドレス】${data.email || ""}

`;
  requests.push({
    insertText: {
      location: { index },
      text: basicInfo,
    },
  });
  index += basicInfo.length;

  // 学歴
  requests.push({
    insertText: {
      location: { index },
      text: "【学歴】\n",
    },
  });
  index += 6;

  if (data.education && data.education.length > 0) {
    for (const edu of data.education) {
      const line = `${edu.year}\t${edu.content}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: line,
        },
      });
      index += line.length;
    }
  }
  requests.push({
    insertText: {
      location: { index },
      text: "\n",
    },
  });
  index += 1;

  // 職歴
  requests.push({
    insertText: {
      location: { index },
      text: "【職歴】\n",
    },
  });
  index += 6;

  if (data.workHistory && data.workHistory.length > 0) {
    for (const work of data.workHistory) {
      const line = `${work.year}\t${work.company}\n\t${work.content}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: line,
        },
      });
      index += line.length;
    }
  }
  requests.push({
    insertText: {
      location: { index },
      text: "\n",
    },
  });
  index += 1;

  // 資格
  if (data.qualifications && data.qualifications.length > 0) {
    requests.push({
      insertText: {
        location: { index },
        text: "【資格・免許】\n",
      },
    });
    index += 9;

    for (const qual of data.qualifications) {
      const line = `${qual.year}\t${qual.name}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: line,
        },
      });
      index += line.length;
    }
    requests.push({
      insertText: {
        location: { index },
        text: "\n",
      },
    });
    index += 1;
  }

  // スキル
  if (data.skills && data.skills.length > 0) {
    requests.push({
      insertText: {
        location: { index },
        text: "【スキル】\n" + data.skills.join("、") + "\n\n",
      },
    });
    index += 8 + data.skills.join("、").length + 2;
  }

  // 志望動機
  if (data.motivation) {
    requests.push({
      insertText: {
        location: { index },
        text: "【志望動機】\n" + data.motivation + "\n\n",
      },
    });
    index += 8 + data.motivation.length + 2;
  }

  // 自己PR
  if (data.selfPR) {
    requests.push({
      insertText: {
        location: { index },
        text: "【自己PR】\n" + data.selfPR + "\n",
      },
    });
  }

  // バッチ更新
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests,
    },
  });

  console.log("Document content added successfully");

  // 共有設定（ミギナナメウエグループへの編集権限）
  try {
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: "domain",
        domain: "migi-nanameue.co.jp",
        role: "writer",
      },
    });
    console.log("Permissions set successfully");
  } catch (e) {
    console.warn("Failed to set permissions:", e);
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    newAccessToken,
  };
}

// 職務経歴書用のGoogleドキュメントを作成
export async function createCVDocument(
  accessToken: string,
  data: {
    name: string;
    birthDate?: string;
    address?: string;
    phone?: string;
    email?: string;
    workHistory?: Array<{ year: string; company: string; content: string }>;
    skills?: string[];
    jobSummary?: string;
    selfPR?: string;
  },
  refreshToken?: string | null
) {
  const { auth, newAccessToken } = await getOAuth2ClientWithRefresh(accessToken, refreshToken);
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const title = `職務経歴書_${data.name || "名前未設定"}_${timestamp}`;

  console.log("Creating CV document:", title);

  // ドキュメント作成
  const doc = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const documentId = doc.data.documentId!;
  console.log("CV Document created with ID:", documentId);

  // ドキュメントにコンテンツを追加
  const requests: any[] = [];
  let index = 1;

  // タイトル
  requests.push({
    insertText: {
      location: { index },
      text: "職 務 経 歴 書\n\n",
    },
  });
  index += 11;

  // 日付と氏名
  const today = new Date().toLocaleDateString("ja-JP");
  requests.push({
    insertText: {
      location: { index },
      text: `${today}\n氏名: ${data.name || ""}\n\n`,
    },
  });
  index += today.length + 6 + (data.name || "").length + 2;

  // 職務要約
  if (data.jobSummary) {
    requests.push({
      insertText: {
        location: { index },
        text: "【職務要約】\n" + data.jobSummary + "\n\n",
      },
    });
    index += 8 + data.jobSummary.length + 2;
  }

  // 職務経歴
  requests.push({
    insertText: {
      location: { index },
      text: "【職務経歴】\n",
    },
  });
  index += 8;

  if (data.workHistory && data.workHistory.length > 0) {
    for (const work of data.workHistory) {
      const line = `■ ${work.company}（${work.year}）\n${work.content}\n\n`;
      requests.push({
        insertText: {
          location: { index },
          text: line,
        },
      });
      index += line.length;
    }
  }

  // スキル
  if (data.skills && data.skills.length > 0) {
    requests.push({
      insertText: {
        location: { index },
        text: "【スキル・技術】\n" + data.skills.join("、") + "\n\n",
      },
    });
    index += 11 + data.skills.join("、").length + 2;
  }

  // 自己PR
  if (data.selfPR) {
    requests.push({
      insertText: {
        location: { index },
        text: "【自己PR】\n" + data.selfPR + "\n",
      },
    });
  }

  // バッチ更新
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests,
    },
  });

  console.log("CV Document content added successfully");

  // 共有設定（ミギナナメウエグループへの編集権限）
  try {
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: "domain",
        domain: "migi-nanameue.co.jp",
        role: "writer",
      },
    });
  } catch (e) {
    console.warn("Failed to set permissions:", e);
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    newAccessToken,
  };
}
