import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold" | "violet";
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
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-spring select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97] hover:scale-[1.015]";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-[#7C5CFF] via-[#6D4DF0] to-[#4F7CFF] hover:from-[#8B7CFF] hover:to-[#608BFF] text-white shadow-glow hover:shadow-glow-violet border border-white/20",
      secondary:
        "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/12 hover:border-lavender/40 backdrop-blur-xl shadow-glass",
      outline:
        "bg-transparent text-gray-200 border border-white/15 hover:bg-white/[0.06] hover:border-lavender/50 hover:text-white backdrop-blur-md",
      gold:
        "bg-gradient-to-r from-[#F6D58A] via-[#FBBF24] to-[#F59E0B] hover:from-[#FDE68A] hover:to-[#FBBF24] text-slate-950 font-bold shadow-glow-gold border border-amber-200/60",
      violet:
        "bg-gradient-to-r from-[#7C5CFF] to-[#6366F1] hover:from-[#8B7CFF] hover:to-[#7C5CFF] text-white shadow-glow-violet border border-white/20",
      ghost:
        "bg-transparent text-gray-300 hover:text-white hover:bg-white/[0.06]",
      danger:
        "bg-error/15 hover:bg-error/25 text-rose-300 border border-error/30 hover:border-error/50",
    };

    const sizeStyles = {
      sm: "text-xs px-3.5 py-1.5 gap-1.5 rounded-lg",
      md: "text-sm px-4.5 py-2.5 gap-2 rounded-xl",
      lg: "text-base px-6 py-3.5 gap-2.5 rounded-xl font-semibold",
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
          <Loader2 className="w-4 h-4 animate-spin text-current" />
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
