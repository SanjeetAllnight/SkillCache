import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TagTone =
  | "primary"
  | "secondary"
  | "surface"
  | "muted"
  | "tertiary"
  | "premium"
  | "dark"
  | "outline";

type TagProps = {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
};

const tones: Record<TagTone, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  surface: "bg-surface-container text-on-surface-variant",
  muted: "bg-surface-container-high text-stone-500",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  premium: "bg-tertiary-fixed text-on-tertiary-fixed",
  dark: "bg-inverse-surface text-inverse-on-surface",
  outline: "border border-outline-variant/30 bg-surface-container-lowest text-on-surface",
};

export function Tag({ children, tone = "secondary", className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
