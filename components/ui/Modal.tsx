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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pencil/30 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-lg bg-white rounded-wobbly border-2 border-pencil shadow-hard-xl p-6 text-pencil animate-in zoom-in-95 duration-100",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper tape accent on modal top */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 paper-tape rotate-[1deg] rounded-sm pointer-events-none z-10" />

        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-full border-2 border-pencil text-pencil hover:text-white hover:bg-marker-red transition-all cursor-pointer shadow-hard-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <X className="w-4 h-4" />
        </button>

        {title && (
          <div className="mb-4 pr-6">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-pencil tracking-tight">{title}</h2>
            {description && (
              <p className="text-xs md:text-sm font-body text-pencil-light mt-1">{description}</p>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
