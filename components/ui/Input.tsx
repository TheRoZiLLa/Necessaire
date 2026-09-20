import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs md:text-sm font-medium text-gray-300 select-none flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "w-full bg-[#0F1117] text-gray-100 placeholder-gray-500 rounded-lg border border-card-border px-3.5 py-2.5 text-sm transition-colors duration-150 outline-none",
              "focus:border-primary focus:ring-1 focus:ring-primary",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-error focus:border-error focus:ring-error text-error/90",
              disabled && "opacity-50 cursor-not-allowed bg-card/50",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-error font-medium transition-all">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
