/**
 * PDF用フォント設定（サーバーサイド用）
 * 絶対URLでフォントを登録
 */

import { Font } from "@react-pdf/renderer";

// サーバーサイド用フォント登録を行う関数
export function registerFonts(baseUrl: string) {
  // ハイフネーション（改行時の単語分割）を無効化
  Font.registerHyphenationCallback((word) => [word]);

  // 日本語フォント登録（Noto Sans JP - 複数ウェイト対応）
  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: `${baseUrl}/fonts/NotoSansJP-Regular.ttf`, fontWeight: "normal" },
      { src: `${baseUrl}/fonts/NotoSansJP-Medium.otf`, fontWeight: 500 },
      { src: `${baseUrl}/fonts/NotoSansJP-Bold.otf`, fontWeight: "bold" },
    ],
  });

  // NotoSansJPMedium を単独のフォントファミリーとして登録
  Font.register({
    family: "NotoSansJPMedium",
    src: `${baseUrl}/fonts/NotoSansJP-Medium.otf`,
  });

  // NotoSansJPBold を単独のフォントファミリーとして登録
  Font.register({
    family: "NotoSansJPBold",
    src: `${baseUrl}/fonts/NotoSansJP-Bold.otf`,
  });
}


