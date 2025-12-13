"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * 汎用セレクトボックスコンポーネント
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[#33475b] mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full px-3 py-2 border rounded-lg transition-all appearance-none bg-white",
            "focus:outline-none focus:ring-2 focus:ring-[#00a4bd] focus:border-transparent",
            error
              ? "border-[#f2545b] focus:ring-[#f2545b]"
              : "border-[#dfe3eb]",
            "disabled:bg-[#f5f8fa] disabled:text-[#7c98b6] disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-[#f2545b] mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-[#7c98b6] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";









