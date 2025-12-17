"use client";

import { useState, useEffect, useCallback } from "react";

interface BirthDateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function BirthDateInput({
  value,
  onChange,
  className = "",
}: BirthDateInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);

  // 初期値をセット
  useEffect(() => {
    if (value) {
      // ISO日付形式をYYYY/MM/DD形式に変換
      // タイムゾーン問題を避けるため、日付文字列から直接パース
      let formatted = "";
      
      // "YYYY-MM-DD" 形式の場合
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split("-");
        formatted = `${year}/${month}/${day}`;
      }
      // ISO形式 "YYYY-MM-DDTHH:mm:ss.sssZ" の場合
      else if (value.includes("T")) {
        const datePart = value.split("T")[0];
        const [year, month, day] = datePart.split("-");
        formatted = `${year}/${month}/${day}`;
      }
      // その他の形式はDateオブジェクトを使用（ローカルタイムで解釈）
      else {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          formatted = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
        }
      }
      
      if (formatted) {
        setDisplayValue(formatted);
        calculateAge(formatted);
      }
    }
  }, []);

  // 年齢計算
  const calculateAge = useCallback((dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return;

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    if (calculatedAge >= 0 && calculatedAge <= 150) {
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, []);

  // うるう年判定
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };

  // 月の最大日数を取得
  const getDaysInMonth = (year: number, month: number): number => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month - 1] || 31;
  };

  // バリデーション
  const validate = useCallback((dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 10) return null;

    const parts = dateStr.split("/");
    if (parts.length !== 3) return "日付形式が正しくありません";

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return "日付形式が正しくありません";
    }

    const currentYear = new Date().getFullYear();

    // 年のバリデーション
    if (year < 1900 || year > currentYear) {
      return `年は1900〜${currentYear}の範囲で入力してください`;
    }

    // 月のバリデーション
    if (month < 1 || month > 12) {
      return "月は1〜12の範囲で入力してください";
    }

    // 日のバリデーション
    const maxDays = getDaysInMonth(year, month);
    if (day < 1 || day > maxDays) {
      return `日は1〜${maxDays}の範囲で入力してください`;
    }

    // 未来の日付チェック
    const inputDate = new Date(year, month - 1, day);
    if (inputDate > new Date()) {
      return "未来の日付は入力できません";
    }

    return null;
  }, []);

  // 入力ハンドラー
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // 数字と/以外を除去
    inputValue = inputValue.replace(/[^\d]/g, "");

    // 自動的に/を挿入
    let formatted = "";
    for (let i = 0; i < inputValue.length && i < 8; i++) {
      if (i === 4 || i === 6) {
        formatted += "/";
      }
      formatted += inputValue[i];
    }

    setDisplayValue(formatted);

    // バリデーション
    const validationError = validate(formatted);
    setError(validationError);

    // 完全な日付が入力されたら親コンポーネントに通知
    if (formatted.length === 10 && !validationError) {
      const parts = formatted.split("/");
      // タイムゾーン問題を避けるため、YYYY-MM-DD形式の文字列として保存
      // toISOString()を使うとUTCに変換されて日付がずれる可能性がある
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      const dateString = `${year}-${month}-${day}T00:00:00.000Z`;
      onChange(dateString);
      calculateAge(formatted);
    } else {
      setAge(null);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="1990/01/15"
          value={displayValue}
          onChange={handleInput}
          maxLength={10}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-500 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-300 focus:ring-orange-500/30 focus:border-orange-500"
          }`}
        />
        {age !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-orange-600 font-medium">
            現在 {age}歳
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        形式: YYYY/MM/DD（数字のみ入力）
      </p>
    </div>
  );
}









