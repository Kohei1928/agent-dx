/**
 * テーマ定数
 * HubSpotライクなカラーパレット
 */

/** カラーパレット */
export const colors = {
  /** プライマリカラー（オレンジ） */
  primary: {
    DEFAULT: "#ff7a59",
    hover: "#e8573f",
    light: "#ff7a59/20",
    dark: "#cc5f48",
  },

  /** セカンダリカラー（ティール） */
  secondary: {
    DEFAULT: "#00a4bd",
    hover: "#0091a8",
    light: "#00a4bd/20",
    dark: "#007d8f",
  },

  /** サクセス（緑） */
  success: {
    DEFAULT: "#00bda5",
    hover: "#00a38e",
    light: "#00bda5/20",
    dark: "#008c7a",
  },

  /** 警告（黄） */
  warning: {
    DEFAULT: "#f5c26b",
    hover: "#e5b055",
    light: "#f5c26b/20",
    dark: "#d4a14a",
  },

  /** エラー（赤） */
  error: {
    DEFAULT: "#f2545b",
    hover: "#dc444b",
    light: "#f2545b/20",
    dark: "#c93a40",
  },

  /** テキストカラー */
  text: {
    primary: "#33475b",
    secondary: "#516f90",
    muted: "#7c98b6",
    inverse: "#ffffff",
    disabled: "#99acc2",
  },

  /** ボーダーカラー */
  border: {
    DEFAULT: "#dfe3eb",
    light: "#eaf0f6",
    dark: "#cbd6e2",
    focus: "#0091ae",
  },

  /** 背景カラー */
  background: {
    DEFAULT: "#f5f8fa",
    card: "#ffffff",
    sidebar: "#2d3e50",
    sidebarHover: "#3d5166",
    sidebarBorder: "#3d5166",
    muted: "#f5f8fa",
    hover: "#eaf0f6",
  },
} as const;

/** フォントサイズ */
export const fontSize = {
  xs: "0.75rem",    // 12px
  sm: "0.875rem",   // 14px
  base: "1rem",     // 16px
  lg: "1.125rem",   // 18px
  xl: "1.25rem",    // 20px
  "2xl": "1.5rem",  // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem",  // 36px
} as const;

/** フォントウェイト */
export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/** スペーシング */
export const spacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

/** 角丸 */
export const borderRadius = {
  none: "0",
  sm: "0.125rem",
  DEFAULT: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

/** 影 */
export const boxShadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

/** トランジション */
export const transition = {
  fast: "150ms ease-in-out",
  DEFAULT: "200ms ease-in-out",
  slow: "300ms ease-in-out",
} as const;

/** サイドバー幅 */
export const sidebarWidth = "16rem"; // 256px

/** Tailwindクラスヘルパー */
export const tw = {
  /** プライマリボタン */
  btnPrimary:
    "bg-[#ff7a59] hover:bg-[#e8573f] text-white font-medium px-4 py-2 rounded-lg transition-colors",
  
  /** セカンダリボタン */
  btnSecondary:
    "bg-[#00a4bd] hover:bg-[#0091a8] text-white font-medium px-4 py-2 rounded-lg transition-colors",
  
  /** アウトラインボタン */
  btnOutline:
    "border border-[#dfe3eb] hover:border-[#cbd6e2] text-[#33475b] font-medium px-4 py-2 rounded-lg transition-colors",
  
  /** デンジャーボタン */
  btnDanger:
    "bg-[#f2545b] hover:bg-[#dc444b] text-white font-medium px-4 py-2 rounded-lg transition-colors",

  /** 入力フィールド */
  input:
    "w-full px-3 py-2 border border-[#dfe3eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a4bd] focus:border-transparent transition-all",

  /** カード */
  card:
    "bg-white rounded-xl border border-[#dfe3eb] shadow-sm",

  /** セクションタイトル */
  sectionTitle:
    "text-lg font-semibold text-[#33475b] mb-4",

  /** ラベル */
  label:
    "block text-sm font-medium text-[#33475b] mb-1",

  /** エラーテキスト */
  errorText:
    "text-sm text-[#f2545b] mt-1",

  /** ヘルプテキスト */
  helpText:
    "text-sm text-[#7c98b6] mt-1",
} as const;

/** グラデーション */
export const gradients = {
  /** プライマリグラデーション */
  primary: "linear-gradient(135deg, #ff7a59 0%, #ff5f40 100%)",
  
  /** セカンダリグラデーション */
  secondary: "linear-gradient(135deg, #00a4bd 0%, #0091ae 100%)",
  
  /** サクセスグラデーション */
  success: "linear-gradient(135deg, #00bda5 0%, #00a38e 100%)",
  
  /** 背景グラデーション */
  background: "linear-gradient(180deg, #f5f8fa 0%, #ffffff 100%)",
} as const;









