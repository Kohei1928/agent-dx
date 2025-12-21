/**
 * PDF用フォント設定
 */

import { Font } from "@react-pdf/renderer";

// ハイフネーション（改行時の単語分割）を無効化
// 日本語文中にハイフン( - )が混入するのを防ぐ
Font.registerHyphenationCallback((word) => [word]);

// 日本語フォント登録（Noto Sans JP - 複数ウェイト）
Font.register({
  family: "NotoSansJP",
  src: "/fonts/NotoSansJP-Regular.ttf",
});

// 太字フォント（メインで使用）
Font.register({
  family: "NotoSansJPBold",
  src: "/fonts/NotoSansJP-Bold.otf",
});

// 中太フォント
Font.register({
  family: "NotoSansJPMedium",
  src: "/fonts/NotoSansJP-Medium.otf",
});

export {};









