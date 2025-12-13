import sgMail from "@sendgrid/mail";

export async function sendErrorNotification(
  email: string,
  errorMessage: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn("SendGrid is not configured, skipping email notification");
    return;
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    to: email,
    from: fromEmail,
    subject: "【TikTok Trend Collector】データ収集エラー通知",
    text: `
TikTok Trend Collectorでデータ収集中にエラーが発生しました。

■ エラー内容
${errorMessage}

■ 発生日時
${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}

■ 対応
ダッシュボードにログインし、設定を確認してください。
問題が解決しない場合は、APIキーの有効性を確認してください。
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #fe2c55 0%, #25f4ee 100%); padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .error-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
    .info { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 TikTok Trend Collector</h1>
    </div>
    <div class="content">
      <p>データ収集中にエラーが発生しました。</p>
      
      <h3>エラー内容</h3>
      <div class="error-box">
        <code>${errorMessage}</code>
      </div>
      
      <h3>発生日時</h3>
      <p>${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
      
      <h3>対応</h3>
      <p>ダッシュボードにログインし、設定を確認してください。<br>
      問題が解決しない場合は、APIキーの有効性を確認してください。</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log("Error notification email sent successfully");
  } catch (error) {
    console.error("Failed to send error notification email:", error);
  }
}















