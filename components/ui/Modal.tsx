"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-lg bg-card rounded-xl border border-card-border shadow-2xl p-6 text-gray-100 animate-in zoom-in-95 duration-150",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-card-border/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {title && (
          <div className="mb-4 pr-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
            {description && (
              <p className="text-xs md:text-sm text-gray-400 mt-1">{description}</p>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
