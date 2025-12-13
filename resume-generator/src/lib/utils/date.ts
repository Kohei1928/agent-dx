/**
 * 日付ユーティリティ
 */

/**
 * 日付を日本語形式にフォーマット
 * @example formatDateJapanese(new Date()) => "2024年1月15日"
 */
export function formatDateJapanese(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 日付をISO形式にフォーマット（日付のみ）
 * @example formatDateISO(new Date()) => "2024-01-15"
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toISOString().split("T")[0];
}

/**
 * 日付を和暦にフォーマット
 * @example formatDateWareki(new Date("2024-01-15")) => "令和6年1月15日"
 */
export function formatDateWareki(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("ja-JP-u-ca-japanese", {
    era: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 時刻をフォーマット
 * @example formatTime("14:30") => "14:30"
 */
export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

/**
 * 日付と時刻を日本語形式にフォーマット
 * @example formatDateTimeJapanese(new Date()) => "2024年1月15日 14:30"
 */
export function formatDateTimeJapanese(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 生年月日から年齢を計算
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(birth.getTime())) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 年月から表示用文字列を生成
 * @example formatYearMonth(2024, 1) => "2024年1月"
 */
export function formatYearMonth(year: number, month: number): string {
  if (!year || !month) return "";
  return `${year}年${month}月`;
}

/**
 * 在籍期間を表示用文字列に変換
 */
export function formatEmploymentPeriod(
  startYear: string,
  startMonth: string,
  endYear: string,
  endMonth: string,
  isCurrentJob: boolean
): string {
  const start = startYear && startMonth ? `${startYear}年${startMonth}月` : "";
  
  if (isCurrentJob) {
    return start ? `${start}〜現在` : "現在";
  }
  
  const end = endYear && endMonth ? `${endYear}年${endMonth}月` : "";
  
  if (start && end) {
    return `${start}〜${end}`;
  }
  
  return start || end || "";
}

/**
 * 日付が有効かどうかをチェック
 */
export function isValidDate(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return !isNaN(d.getTime());
}

/**
 * 日付を比較（日付のみ、時刻は無視）
 * @returns -1: a < b, 0: a === b, 1: a > b
 */
export function compareDates(a: Date | string, b: Date | string): number {
  const dateA = new Date(typeof a === "string" ? a : a.toISOString().split("T")[0]);
  const dateB = new Date(typeof b === "string" ? b : b.toISOString().split("T")[0]);
  
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  return 0;
}

/**
 * 曜日を取得
 */
export function getDayOfWeek(date: Date | string, locale: "ja" | "en" = "ja"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  const days = {
    ja: ["日", "月", "火", "水", "木", "金", "土"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };
  
  return days[locale][d.getDay()];
}









