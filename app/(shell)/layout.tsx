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
      <Navbar />
      <main className="min-h-screen overflow-x-hidden pb-24 pt-16 md:ml-64 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
