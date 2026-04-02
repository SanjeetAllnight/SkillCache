import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "solid"
  | "secondary"
  | "softPrimary"
  | "surface"
  | "outline"
  | "white"
  | "dark"
  | "ghost"
  | "danger"
  | "text";

type ButtonSize = "sm" | "md" | "lg" | "icon";

type BaseButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  rounded?: "full" | "xl" | "lg";
};

type ButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-editorial hover:-translate-y-0.5",
  solid: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-secondary-container text-on-secondary-container hover:opacity-85",
  softPrimary:
    "bg-primary-container text-on-primary-container hover:bg-primary-container/80",
  surface:
    "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
  outline:
    "border border-outline-variant/70 text-on-surface hover:bg-surface-container",
  white:
    "bg-surface-container-lowest text-on-surface shadow-sm hover:bg-white",
  dark: "bg-inverse-surface text-inverse-on-surface hover:opacity-90",
  ghost: "text-primary hover:opacity-75",
  danger: "bg-error text-white hover:bg-error/90",
  text: "text-primary hover:opacity-80",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
  icon: "h-12 w-12 p-0",
};

const roundedStyles = {
  full: "rounded-full",
  xl: "rounded-xl",
  lg: "rounded-lg",
};

function getButtonClassName({
  variant = "primary",
  size = "md",
  rounded = "full",
  className,
}: BaseButtonProps) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
    variants[variant],
    sizes[size],
    roundedStyles[rounded],
    className,
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  rounded = "full",
  className,
  ...props
}: ButtonProps) {
  const buttonClassName = getButtonClassName({
    variant,
    size,
    rounded,
    className,
    children,
  });

  if (href) {
    return (
      <Link href={href} className={buttonClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
