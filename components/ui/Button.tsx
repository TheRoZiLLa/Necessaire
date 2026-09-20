import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-body font-semibold rounded-wobbly-sm transition-all duration-100 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pen-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    const variantStyles = {
      primary:
        "bg-white text-pencil border-2 border-pencil shadow-hard hover:bg-marker-red hover:text-white hover:border-pencil hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      secondary:
        "bg-[#f4eee5] text-pencil border-2 border-pencil shadow-hard hover:bg-pen-blue hover:text-white hover:border-pencil hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      outline:
        "bg-transparent text-pencil border-2 border-pencil shadow-hard-sm hover:bg-paper-muted/60 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
      ghost:
        "bg-transparent text-pencil hover:bg-paper-muted/50 hover:rotate-1 active:scale-95",
      danger:
        "bg-[#fee2e2] text-marker-red border-2 border-marker-red shadow-hard-red hover:bg-[#fca5a5] hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      gold:
        "bg-sticky-yellow text-pencil font-bold border-2 border-pencil shadow-hard hover:bg-[#fef08a] hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    };

    const sizeStyles = {
      sm: "text-xs md:text-sm px-3 py-1.5 gap-1.5",
      md: "text-sm md:text-base px-4 py-2 gap-2",
      lg: "text-base md:text-lg px-6 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
