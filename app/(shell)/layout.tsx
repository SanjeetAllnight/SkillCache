import React from "react";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Navbar } from "@/components/shell/navbar";
import { Sidebar } from "@/components/shell/sidebar";

export default function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <React.Suspense fallback={<header className="fixed left-0 right-0 top-0 z-40 h-16 bg-surface/80" />}>
        <Navbar />
      </React.Suspense>
      <main className="min-h-screen overflow-x-hidden pb-24 pt-16 md:ml-64 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
