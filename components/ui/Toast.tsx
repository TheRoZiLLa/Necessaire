"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; message: string; title?: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      type = "info",
      message,
      title,
      duration = 4000,
    }: {
      type?: ToastType;
      message: string;
      title?: string;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, title }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (message, title) => addToast({ type: "success", message, title }),
    error: (message, title) => addToast({ type: "error", message, title }),
    info: (message, title) => addToast({ type: "info", message, title }),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 md:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200",
              t.type === "success" &&
                "bg-card/95 border-success/40 text-gray-100 shadow-success/10",
              t.type === "error" &&
                "bg-card/95 border-error/40 text-gray-100 shadow-error/10",
              t.type === "info" &&
                "bg-card/95 border-primary/40 text-gray-100 shadow-primary/10"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-5 h-5 text-error" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-primary-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-0.5">
                  {t.title}
                </h4>
              )}
              <p className="text-sm text-gray-200 leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 text-gray-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
