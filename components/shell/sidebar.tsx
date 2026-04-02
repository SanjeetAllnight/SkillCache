"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMockUser } from "@/components/providers/mock-user-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getSidebarConfig, navItems } from "@/lib/shell-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const sidebarConfig = getSidebarConfig(pathname);
  const { user, isLoggedIn } = useMockUser();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-outline-variant/10 bg-surface px-5 py-8 xl:px-6 md:flex">
      <div className="mb-12">
        <Link href="/dashboard" className="font-headline text-2xl font-black tracking-tighter text-primary">
          SkillCache
        </Link>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-stone-500">
          Digital Atelier
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-stone-500 transition-colors",
                active
                  ? "translate-x-1 border-r-4 border-primary bg-surface-container font-bold text-primary"
                  : "hover:bg-surface-container-low",
              )}
            >
              <Icon name={item.icon} filled={active} />
              <span className="font-headline text-lg">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-6">
        <Button href="/profile" className="w-full rounded-2xl" rounded="xl">
          {sidebarConfig.shareIcon ? (
            <Icon name={sidebarConfig.shareIcon} className="text-lg" />
          ) : null}
          Share a Skill
        </Button>

        {sidebarConfig.showProfileFooter && isLoggedIn ? (
          <div className="flex items-center gap-3 px-2">
            <Image
              src={user.avatar}
              alt={user.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border-2 border-primary-container object-cover"
            />
            <div>
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs font-medium text-stone-500">{user.role}</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
