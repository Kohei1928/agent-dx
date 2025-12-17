"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * 汎用入力フィールドコンポーネント
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 border-2 rounded-xl transition-all",
            "bg-slate-50 focus:bg-white",
            "focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500",
            error
              ? "border-red-500 focus:ring-red-100 focus:border-red-500"
              : "border-transparent focus:border-orange-500",
            "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
            "placeholder:text-slate-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-slate-500 mt-2">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
