"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
};

/**
 * ローディングスピナーコンポーネント
 */
export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-[#ff7a59] border-t-transparent animate-spin",
        sizeStyles[size],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

/**
 * ローディングオーバーレイコンポーネント
 */
export function LoadingOverlay({ message = "読み込み中..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-[#516f90]">{message}</p>
      </div>
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
}

/**
 * ページローディングコンポーネント
 */
export function PageLoading({ message = "読み込み中..." }: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa]">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-[#516f90]">{message}</p>
      </div>
    </div>
  );
}









