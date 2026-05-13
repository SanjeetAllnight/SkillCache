"use client";

import { Icon } from "@/components/ui/icon";
import type { SessionStatus } from "@/lib/firebaseServices";
import { cn } from "@/lib/utils";

type SessionStatusBadgeProps = {
  status: SessionStatus;
  callStatus?: string | null;
  className?: string;
};

const statusConfig: Record<SessionStatus, { label: string; icon: string; className: string; filled?: boolean }> = {
  pending: {
    label: "Pending",
    icon: "hourglass_top",
    className: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  },
  accepted: {
    label: "Accepted",
    icon: "check_circle",
    className: "bg-primary/10 text-primary ring-primary/20",
    filled: true,
  },
  upcoming: {
    label: "Upcoming",
    icon: "event_available",
    className: "bg-secondary-container text-on-secondary-container ring-secondary/20",
  },
  live: {
    label: "Live",
    icon: "radio_button_checked",
    className: "bg-tertiary/10 text-tertiary ring-tertiary/20",
    filled: true,
  },
  completed: {
    label: "Completed",
    icon: "task_alt",
    className: "bg-primary-container/40 text-on-primary-container ring-primary/15",
    filled: true,
  },
  cancelled: {
    label: "Cancelled",
    icon: "event_busy",
    className: "bg-error/10 text-error ring-error/20",
  },
  missed: {
    label: "Missed",
    icon: "schedule_send",
    className: "bg-surface-container-high text-stone-600 ring-outline-variant/30",
  },
};

export function SessionStatusBadge({ status, callStatus, className }: SessionStatusBadgeProps) {
  const config = statusConfig[status];
  const label = status === "live" && callStatus === "joined" ? "Learner Joining" : config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ring-1",
        config.className,
        className,
      )}
    >
      <Icon name={config.icon} filled={config.filled} className="text-sm" />
      {label}
    </span>
  );
}
