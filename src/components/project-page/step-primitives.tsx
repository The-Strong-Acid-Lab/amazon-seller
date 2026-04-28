export function StepHeading({
  num,
  label,
  sub,
}: {
  num: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="mb-2">
      <div
        className="font-mono text-xs font-medium"
        style={{ color: "var(--accent-blue)" }}
      >
        {num} · {label.toUpperCase()}
      </div>
      <p className="mt-1 text-sm text-stone-400">{sub}</p>
    </div>
  );
}

export function LockedStep({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--page-border)] bg-white text-center">
      <div className="text-2xl opacity-30">🔒</div>
      <p className="mt-3 text-sm text-stone-400">{message}</p>
    </div>
  );
}
