import { cn, titleCase, scoreColor, initials } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600")}>
      {titleCase(status)}
    </span>
  );
}

export function ScoreBadge({ score, label }: { score: number | null; label?: string }) {
  return (
    <span className={cn("badge font-semibold", scoreColor(score))} title={label}>
      {score ?? "—"}
    </span>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ""} width={size} height={size}
      className="rounded-full object-cover bg-slate-100" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className="text-2xl font-semibold text-ink-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-ink-700 font-medium">{title}</p>
      {hint && <p className="text-sm text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}
