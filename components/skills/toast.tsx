"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastData = {
  id: string;
  message: string;
  variant?: ToastVariant;
};

type ToastItemProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

const variantStyles: Record<ToastVariant, string> = {
  success: "border-primary/20 bg-primary/10 text-primary",
  error:   "border-error/20 bg-error/10 text-error",
  info:    "border-secondary/20 bg-secondary-container/50 text-on-secondary-container",
};

const iconMap: Record<ToastVariant, string> = {
  success: "check_circle",
  error:   "error",
  info:    "info",
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const variant = toast.variant ?? "success";

  useEffect(() => {
    // Trigger slide-in
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 3 s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 350);
    }, 3000);
    return () => { cancelAnimationFrame(show); clearTimeout(timer); };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-ambient text-sm font-medium",
        "transition-all duration-300 ease-in-out",
        variantStyles[variant],
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-10 opacity-0",
      )}
    >
      <span className="material-symbols-outlined text-base leading-none">
        {iconMap[variant]}
      </span>
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 350); }}
        className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-base leading-none">close</span>
      </button>
    </div>
  );
}

type ToastPortalProps = {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
};

export function ToastPortal({ toasts, onDismiss }: ToastPortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-[min(calc(100vw-3rem),22rem)]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

/** Utility to push a new toast into an array, generating a unique ID. */
export function pushToast(
  prev: ToastData[],
  message: string,
  variant: ToastVariant = "success",
): ToastData[] {
  return [
    ...prev,
    { id: `toast-${Date.now()}-${Math.random()}`, message, variant },
  ];
}
