import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  tape?: boolean;
}

export function Card({
  className,
  hoverable = false,
  tape = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative bg-white text-pencil rounded-wobbly border-2 border-pencil shadow-hard-lg overflow-visible transition-all duration-150",
        hoverable &&
          "hover:border-pencil hover:shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer",
        className
      )}
      {...props}
    >
      {tape && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 paper-tape rotate-[-2deg] z-10 pointer-events-none rounded-sm" />
      )}
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-5 border-b-2 border-paper-muted", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xl font-heading font-bold text-pencil tracking-tight flex items-center gap-2",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs md:text-sm text-pencil-light mt-1 font-body leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 bg-paper-dark border-t-2 border-paper-muted flex items-center justify-between rounded-b-wobbly",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
