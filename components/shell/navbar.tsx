"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getHeaderConfig } from "@/lib/shell-config";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = getHeaderConfig(pathname);
  const { user, isLoggedIn, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);

      const params = new URLSearchParams(searchParams.toString());
      if (val.trim()) {
        params.set("q", val);
      } else {
        params.delete("q");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-4 bg-surface/80 px-5 backdrop-blur-xl sm:px-6 md:left-64 md:px-8 xl:px-12">
      <div className="min-w-0 flex-1">
        <div className="relative w-full max-w-lg rounded-full bg-surface-container-low px-4 py-2">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={config.placeholder}
            className="w-full border-none bg-transparent pl-8 pr-2 text-sm text-on-surface placeholder:text-stone-400 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="ml-2 flex items-center gap-3 sm:ml-4 md:ml-8 md:gap-4 lg:gap-6">
        <div className="hidden items-center gap-3 text-stone-500 sm:flex md:gap-4">
          <button type="button" className="transition-opacity hover:opacity-80">
            <Icon name="notifications" />
          </button>
          <button type="button" className="transition-opacity hover:opacity-80">
            <Icon name="settings" />
          </button>
        </div>
        {config.actionVariant === "text" ? (
          <>
            <div className="hidden h-8 w-px bg-outline-variant/30 md:block" />
            <Button
              href={config.actionHref}
              variant="text"
              className="hidden shrink-0 md:inline-flex"
            >
              {config.actionLabel}
            </Button>
          </>
        ) : (
          <Button
            href={config.actionHref}
            variant={config.actionVariant}
            size="sm"
            className="hidden shrink-0 md:inline-flex"
          >
            {config.actionLabel}
          </Button>
        )}
        {isLoggedIn ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hidden border-outline-variant/60 bg-surface-container-low md:inline-flex"
            >
              Logout
              <Icon name="logout" className="text-base" />
            </Button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full bg-surface-container-low p-2 text-stone-500 transition-colors hover:bg-surface-container-high md:hidden"
              aria-label="Logout"
            >
              <Icon name="logout" />
            </button>
            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary-container bg-primary-container font-headline text-sm font-bold text-on-primary-container transition-transform hover:scale-[1.02]"
              aria-label="Go to profile"
            >
              {user?.name ? user.name[0].toUpperCase() : "?"}
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
