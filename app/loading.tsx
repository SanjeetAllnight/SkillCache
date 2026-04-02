import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 sm:px-6 md:px-8">
      <div className="w-full max-w-xl space-y-6 text-center">
        <div className="mx-auto flex w-fit items-center gap-3 rounded-full bg-surface-container px-5 py-2 text-sm font-medium text-on-surface-variant">
          <Skeleton className="h-2 w-2 rounded-full bg-primary/70" />
          Loading...
        </div>
        <Skeleton className="mx-auto h-16 w-72" />
        <Skeleton className="mx-auto h-5 w-48" />
        <div className="flex justify-center gap-4 pt-2">
          <Skeleton className="h-12 w-40 rounded-full" />
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
      </div>
    </main>
  );
}
