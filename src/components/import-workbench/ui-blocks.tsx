import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FieldBlock({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <p
        className={cn(
          "text-sm font-medium",
          error ? "text-rose-700" : "text-stone-900",
        )}
      >
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </p>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs leading-5 text-rose-700">{message}</p>;
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-[var(--page-border)] bg-white/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        {description && (
          <p className="text-xs leading-6 text-[var(--page-muted)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[1.5rem] border border-[var(--page-border)] bg-white/76 shadow-none">
      <CardContent className="px-4 !py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--page-muted)]">
          {label}
        </p>
        <p className="mt-3 text-lg font-semibold text-stone-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export function InfoCard({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description?: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Card className="rounded-[1.5rem] border border-[var(--page-border)] bg-white/76 shadow-none">
      <CardContent className="!p-4">
        <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[var(--page-muted)]">
            {description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {items.length > 0 ? (
            items.map((item) => {
              const isMissing = item.includes("（未检测到）");

              return (
                <Badge
                  key={item}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    isMissing
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-stone-300 bg-white text-stone-700",
                  )}
                  variant="outline"
                >
                  {item}
                </Badge>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">{emptyLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
