/**
 * PDF用フォント設定
 */

import { Font } from "@react-pdf/renderer";

// ハイフネーション（改行時の単語分割）を無効化
// 日本語文中にハイフン( - )が混入するのを防ぐ
Font.registerHyphenationCallback((word) => [word]);

// 日本語フォント登録（Noto Sans JP - 複数ウェイト対応）
Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "/fonts/NotoSansJP-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/NotoSansJP-Medium.otf", fontWeight: 500 },
    { src: "/fonts/NotoSansJP-Bold.otf", fontWeight: "bold" },
  ],
});

// NotoSansJPMedium を単独のフォントファミリーとして登録
// スタイルファイルで fontFamily: "NotoSansJPMedium" として使用される
Font.register({
  family: "NotoSansJPMedium",
  src: "/fonts/NotoSansJP-Medium.otf",
});

// NotoSansJPBold を単独のフォントファミリーとして登録
// スタイルファイルで fontFamily: "NotoSansJPBold" として使用される
Font.register({
  family: "NotoSansJPBold",
  src: "/fonts/NotoSansJP-Bold.otf",
});

export {};









