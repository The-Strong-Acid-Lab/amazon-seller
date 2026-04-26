export default function ProjectLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-20 border-b border-[var(--page-border)] bg-white/95">
        {/* Project header */}
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-3">
              <div className="h-3 w-24 rounded-full bg-stone-200" />
              <div className="h-8 w-56 rounded-lg bg-stone-200" />
              <div className="flex gap-3">
                <div className="h-3 w-12 rounded-full bg-stone-100" />
                <div className="h-3 w-20 rounded-full bg-stone-100" />
                <div className="h-3 w-28 rounded-full bg-stone-100" />
              </div>
            </div>
            <div className="h-9 w-24 rounded-lg bg-stone-200" />
          </div>
        </div>

        {/* Step bar skeleton */}
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-6 pb-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-stone-200" />
                <div className="grid gap-1">
                  <div className="h-3 w-10 rounded-full bg-stone-200" />
                  <div className="h-2 w-5 rounded-full bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
        <div className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <LoadingBlock lines={4} />
            <LoadingBlock lines={4} />
          </div>
          <LoadingBlock lines={5} />
          <LoadingBlock lines={3} />
        </div>
      </div>
    </div>
  );
}

function LoadingBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-[var(--page-border)] bg-white p-5">
      <div className="mb-4 h-4 w-32 rounded-full bg-stone-200" />
      <div className="grid gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 rounded-full bg-stone-100 ${
              i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-5/6" : "w-2/3"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
