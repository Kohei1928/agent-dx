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
            className="block text-sm font-medium text-[#33475b] mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2 border rounded-lg transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[#00a4bd] focus:border-transparent",
            error
              ? "border-[#f2545b] focus:ring-[#f2545b]"
              : "border-[#dfe3eb]",
            "disabled:bg-[#f5f8fa] disabled:text-[#7c98b6] disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-[#f2545b] mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-[#7c98b6] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";









