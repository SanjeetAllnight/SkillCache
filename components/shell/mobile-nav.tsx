"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { navItems } from "@/lib/shell-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/10 bg-surface-container-lowest/95 px-3 backdrop-blur sm:px-4 md:hidden">
      <div className="grid h-16 grid-cols-5 items-center">
        {navItems.slice(0, 2).map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-bold",
                active ? "text-primary" : "text-stone-500",
              )}
            >
              <Icon name={item.icon} filled={active} />
              <span>{item.label === "Find Mentors" ? "Mentors" : "Dash"}</span>
            </Link>
          );
        })}

        <Link
          href="/dashboard"
          className="mx-auto -translate-y-5 rounded-full bg-primary p-3 text-white shadow-lg shadow-primary/30"
        >
          <Icon name="add" />
        </Link>

        {navItems.slice(2, 4).map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-bold",
                active ? "text-primary" : "text-stone-500",
              )}
            >
              <Icon name={item.icon} filled={active} />
              <span>{item.label === "Repository" ? "Library" : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
