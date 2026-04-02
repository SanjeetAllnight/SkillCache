import { Skeleton } from "@/components/ui/skeleton";

export default function ShellLoading() {
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-outline-variant/10 bg-surface px-5 py-8 xl:px-6 md:flex">
        <Skeleton className="mb-12 h-10 w-36" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
        <div className="mt-auto space-y-6">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="flex items-center gap-3 px-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface/80 px-5 backdrop-blur-xl sm:px-6 md:left-64 md:px-8 xl:px-12">
        <Skeleton className="h-10 w-full max-w-md rounded-full" />
        <div className="ml-8 hidden items-center gap-4 md:flex">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <main className="pb-24 pt-28 md:ml-64 md:pb-0">
        <div className="page-shell space-y-8 pt-0">
          <div className="space-y-4">
            <Skeleton className="h-14 w-96" />
            <Skeleton className="h-5 w-[32rem]" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
