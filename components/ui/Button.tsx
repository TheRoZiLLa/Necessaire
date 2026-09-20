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
        "bg-gradient-to-r from-[#FF3366] to-[#E11D48] hover:from-[#FF4777] hover:to-[#F43F5E] text-white shadow-glow hover:shadow-lg hover:shadow-primary/40 border border-white/20",
      secondary:
        "bg-card/90 hover:bg-card-hover text-gray-100 border border-white/10 hover:border-violet-light/40 shadow-md backdrop-blur-md",
      outline:
        "bg-white/[0.04] text-gray-200 border border-white/12 hover:bg-white/[0.08] hover:border-gold-light/60 hover:text-white backdrop-blur-md",
      gold:
        "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold shadow-glow-gold hover:shadow-xl hover:shadow-amber-500/30 border border-amber-200/50",
      violet:
        "bg-gradient-to-r from-violet via-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-glow-violet hover:shadow-lg hover:shadow-violet/40 border border-white/20",
      ghost:
        "bg-transparent text-gray-300 hover:text-white hover:bg-white/[0.06]",
      danger:
        "bg-error/20 hover:bg-error/30 text-error border border-error/40 hover:border-error/60",
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
