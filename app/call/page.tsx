import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { callPageData } from "@/lib/mock-data";

const controls = [
  { label: "Mute", icon: "mic" },
  { label: "Camera Toggle", icon: "videocam" },
  { label: "Share", icon: "present_to_all" },
  { label: "Options", icon: "more_horiz" },
];

export default function CallPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-stone-950 text-white">
      <Image
        src={callPageData.mainVideo}
        alt={callPageData.title}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />

      <header className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-stone-950/60 to-transparent px-5 py-5 sm:px-6 md:px-10 md:py-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-headline font-bold">
            SC
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-headline text-lg font-bold">
              {callPageData.title}
            </h1>
            <p className="text-xs font-medium text-stone-300">
              {callPageData.subtitle} &middot; {callPageData.duration}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="rounded-full bg-tertiary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Live
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <Icon name="group" className="text-xl text-white" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <Icon name="chat_bubble" className="text-xl text-white" />
          </button>
        </div>
      </header>

      <div className="absolute bottom-28 right-5 z-20 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl sm:h-52 sm:w-40 md:bottom-32 md:right-10 md:h-64 md:w-48">
        <Image
          src={callPageData.selfVideo}
          alt="Self view"
          fill
          className="object-cover"
          sizes="192px"
        />
        <div className="absolute bottom-2 left-2 rounded-md bg-stone-900/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-md">
          You
        </div>
      </div>

      <nav className="absolute bottom-5 left-1/2 z-30 flex w-[calc(100%-2.5rem)] max-w-3xl -translate-x-1/2 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-stone-900/80 px-4 py-3 shadow-2xl backdrop-blur-2xl sm:w-auto sm:px-6 md:bottom-8 md:gap-6 md:px-8 md:py-4">
        {controls.map((control) => (
          <button
            key={control.label}
            type="button"
            className="group flex flex-col items-center gap-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white/20 md:h-14 md:w-14">
              <Icon name={control.icon} className="text-xl text-white md:text-2xl" />
            </div>
            <span className="text-[10px] uppercase tracking-tight text-stone-400">
              {control.label}
            </span>
          </button>
        ))}
        <div className="mx-1 hidden h-10 w-px bg-white/10 md:block" />
        <Link href="/sessions" className="group flex flex-col items-center gap-1">
          <div className="flex h-11 w-14 items-center justify-center rounded-full bg-error px-4 transition-all hover:bg-red-700 md:h-14 md:w-16 md:px-6">
            <Icon name="call_end" filled className="text-xl text-white md:text-2xl" />
          </div>
          <span className="text-[10px] uppercase tracking-tight text-error">End Call</span>
        </Link>
      </nav>

      <div className="absolute bottom-24 left-5 z-20 rounded-full border border-white/5 bg-stone-900/40 px-3 py-1.5 backdrop-blur-md sm:bottom-28 md:bottom-8 md:left-10">
        <div className="flex items-center gap-2 text-xs text-stone-300">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Connection Stable</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-5 top-5 z-10 font-headline text-3xl font-black tracking-tighter text-white/20 sm:right-6 md:right-10 md:top-10">
        SkillCache
      </div>
    </main>
  );
}
