import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProjectLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6">
        <Card className="rounded-xl border border-[var(--page-border)] bg-white/80 px-6 py-6 shadow-[0_20px_70px_rgba(54,40,24,0.08)] sm:px-8">
          <div className="grid gap-4">
            <div className="h-4 w-28 rounded-full bg-stone-200" />
            <div className="h-12 w-64 rounded-xl bg-stone-200" />
            <div className="h-5 w-[28rem] max-w-full rounded-full bg-stone-100" />
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <LoadingBlock lines={5} />
            <LoadingGrid />
            <LoadingBlock lines={6} />
            <LoadingBlock lines={6} />
          </div>

          <div className="grid gap-6">
            <LoadingBlock lines={4} />
            <LoadingBlock lines={5} />
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadingBlock({ lines = 4 }: { lines?: number }) {
  return (
    <Card className="rounded-xl border border-[var(--page-border)] bg-white/80">
      <CardHeader className="space-y-3">
        <div className="h-6 w-40 rounded-full bg-stone-200" />
        <div className="h-4 w-64 rounded-full bg-stone-100" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-4 rounded-full bg-stone-100 ${
              index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-5/6" : "w-2/3"
            }`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="rounded-xl border border-[var(--page-border)] bg-white/80"
        >
          <CardContent className="grid gap-3 p-6 mt-4">
            <div className="h-4 w-20 rounded-full bg-stone-200" />
            <div className="h-10 w-16 rounded-xl bg-stone-100" />
            <div className="h-4 w-24 rounded-full bg-stone-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

