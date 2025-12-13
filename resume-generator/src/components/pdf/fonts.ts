/**
 * PDF用フォント設定
 */

import { Font } from "@react-pdf/renderer";

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









