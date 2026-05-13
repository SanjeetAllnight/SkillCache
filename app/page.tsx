import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { splashData } from "@/lib/static-assets";

export default function SplashPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(148,207,160,0.2),_rgba(253,250,230,1)_38%)] px-5 py-10 sm:px-6 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(50,105,67,0.03)_1px,transparent_1px)] bg-[length:24px_24px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,207,160,0.16),_transparent_55%)]" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="animate-fade-up flex flex-col items-center">
          <div className="animate-soft-float mb-8 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <Icon name="brush" className="text-5xl text-primary" />
          </div>

          <span className="mb-4 rounded-full bg-surface-container px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
            The Digital Atelier
          </span>

          <h1 className="font-headline text-6xl font-extrabold tracking-tighter text-primary sm:text-7xl md:text-8xl">
            SkillCache
          </h1>

          <p className="mt-4 text-sm uppercase tracking-editorial text-on-surface-variant">
            Digital Atelier
          </p>

          <div className="my-8 h-[2px] w-14 rounded-full bg-outline-variant/30" />

          <p className="max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            A quiet, curated space for mentorship, creative exchange, guided sessions,
            and a growing repository of craft knowledge.
          </p>
        </div>

        <div className="animate-fade-up-delayed mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Button
              href="/auth"
              size="lg"
              className="min-w-[180px] justify-center px-10 shadow-editorial"
            >
              Get Started
            </Button>
            <Button
              href="/dashboard"
              variant="outline"
              size="lg"
              className="min-w-[180px] justify-center border-outline-variant bg-surface-container-lowest/80 px-10 backdrop-blur-sm"
            >
              Explore Dashboard
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-medium tracking-wide text-on-surface-variant">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span>CURATING YOUR EXPERIENCE</span>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 left-0 flex w-full flex-col items-center justify-between gap-2 px-5 text-xs font-medium text-on-surface-variant opacity-70 sm:px-6 md:bottom-10 md:flex-row md:px-8">
        <span>&copy; 2024 SkillCache Exchange</span>
        <div className="flex items-center gap-6">
          <Link href="/auth" className="transition-colors hover:text-primary">
            Manifesto
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-primary">
            Guidelines
          </Link>
        </div>
      </footer>

      <div className="pointer-events-none fixed -bottom-16 -left-16 hidden h-96 w-80 rotate-12 rounded-2xl border border-outline-variant/10 bg-surface-container-highest/50 p-4 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <Image
            src={splashData.leftImage}
            alt="Creative studio"
            fill
            className="object-cover"
            sizes="320px"
          />
        </div>
      </div>
      <div className="pointer-events-none fixed -right-14 -top-14 hidden h-80 w-64 -rotate-12 rounded-2xl border border-outline-variant/10 bg-surface-container-highest/50 p-4 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <Image
            src={splashData.rightImage}
            alt="Artistic workspace"
            fill
            className="object-cover"
            sizes="256px"
          />
        </div>
      </div>
    </main>
  );
}
