/**
 * 日付ユーティリティ
 */

/**
 * 日付文字列をタイムゾーン安全にDateオブジェクトに変換
 * ISO形式 "YYYY-MM-DDTHH:mm:ss.sssZ" または "YYYY-MM-DD" 形式から
 * UTCの深夜0時を表すDateを返す
 * @example parseDateSafe("2003-05-18") => Date representing 2003-05-18T00:00:00.000Z
 */
export function parseDateSafe(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // "YYYY-MM-DD" 形式の場合
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }
  
  // ISO形式 "YYYY-MM-DDTHH:mm:ss.sssZ" の場合
  // 時刻部分を無視して日付部分だけを使用
  if (dateStr.includes("T")) {
    const datePart = dateStr.split("T")[0];
    return new Date(`${datePart}T00:00:00.000Z`);
  }
  
  // その他の形式
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 日付文字列からタイムゾーン安全なISO形式を取得
 * @example toSafeISOString("2003-05-18") => "2003-05-18T00:00:00.000Z"
 */
export function toSafeISOString(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  // "YYYY-MM-DD" 形式の場合
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${dateStr}T00:00:00.000Z`;
  }
  
  // ISO形式の場合、日付部分だけを抽出して再構築
  if (dateStr.includes("T")) {
    const datePart = dateStr.split("T")[0];
    return `${datePart}T00:00:00.000Z`;
  }
  
  return null;
}

/**
 * 日付を日本語形式にフォーマット
 * タイムゾーンの影響を受けないよう、日付文字列から直接パース
 * @example formatDateJapanese(new Date()) => "2024年1月15日"
 */
export function formatDateJapanese(date: Date | string): string {
  let year: number, month: number, day: number;
  
  if (typeof date === "string") {
    // "YYYY-MM-DD" 形式または "YYYY-MM-DDTHH:mm:ss.sssZ" 形式から日付部分を抽出
    const datePart = date.includes("T") ? date.split("T")[0] : date;
    const parts = datePart.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return `${year}年${month}月${day}日`;
      }
    }
    // パースできない場合はDateオブジェクトに変換
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  } else {
    if (isNaN(date.getTime())) return "";
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }
  
  return `${year}年${month}月${day}日`;
}

/**
 * 日付をISO形式にフォーマット（日付のみ）
 * タイムゾーンの影響を受けないよう、ローカル日付を使用
 * @example formatDateISO(new Date()) => "2024-01-15"
 */
export function formatDateISO(date: Date | string): string {
  // 文字列の場合、ISO形式から日付部分を直接抽出
  if (typeof date === "string") {
    // "YYYY-MM-DD" 形式の場合
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    // ISO形式 "YYYY-MM-DDTHH:mm:ss.sssZ" の場合
    if (date.includes("T")) {
      return date.split("T")[0];
    }
  }
  
  // Dateオブジェクトの場合、ローカルタイムゾーンで日付を取得
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * 日付を和暦にフォーマット
 * タイムゾーンの影響を受けないよう、日付文字列から直接パース
 * @example formatDateWareki(new Date("2024-01-15")) => "令和6年1月15日"
 */
export function formatDateWareki(date: Date | string): string {
  let localDate: Date;
  
  if (typeof date === "string") {
    // "YYYY-MM-DD" 形式または "YYYY-MM-DDTHH:mm:ss.sssZ" 形式から日付部分を抽出
    const datePart = date.includes("T") ? date.split("T")[0] : date;
    const parts = datePart.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // ローカルタイムゾーンで日付を作成
        localDate = new Date(year, month - 1, day);
      } else {
        return "";
      }
    } else {
      localDate = new Date(date);
    }
  } else {
    localDate = date;
  }
  
  if (isNaN(localDate.getTime())) return "";
  
  return localDate.toLocaleDateString("ja-JP-u-ca-japanese", {
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









