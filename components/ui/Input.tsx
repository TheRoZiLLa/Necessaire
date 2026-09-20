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
            className="text-sm font-heading font-bold text-pencil select-none flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-pencil-light">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "w-full bg-white text-pencil placeholder:text-pencil-muted/70 rounded-wobbly-sm border-2 border-pencil px-4 py-2.5 text-base font-body shadow-hard-sm transition-all duration-100 outline-none",
              "focus:border-pen-blue focus:shadow-hard-blue focus:translate-x-[1px] focus:translate-y-[1px]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-marker-red text-marker-red focus:border-marker-red focus:shadow-hard-red",
              disabled && "opacity-50 cursor-not-allowed bg-paper-muted",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-pencil-light">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs font-body font-semibold text-marker-red transition-all">{error}</p>
        ) : helperText ? (
          <p className="text-xs font-body text-pencil-light">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
