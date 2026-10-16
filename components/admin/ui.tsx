import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingStatus } from "@/lib/db/schema";
import { BOOKING_STATUS_SHORT } from "@/lib/constants";

const BOOKING_PILL: Record<BookingStatus, string> = {
  pending: "border-warn/40 bg-warn/10 text-warn",
  confirmed: "border-ok/40 bg-ok/10 text-ok",
  waitlisted: "border-info/40 bg-info/10 text-info",
  cancelled: "border-white/15 bg-white/[0.04] text-mist",
  rejected: "border-danger/40 bg-danger/10 text-danger",
  attended: "border-gold-400/50 bg-gold-400/10 text-gold-300",
  no_show: "border-danger/40 bg-danger/[0.06] text-danger",
};

export function BookingPill({ status }: { status: BookingStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${BOOKING_PILL[status]}`}>{BOOKING_STATUS_SHORT[status]}</span>;
}

export function AdminPageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-mist hover:text-gold-300">
            <ChevronLeft className="h-4 w-4" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="text-4xl text-ivory">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-mist">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.08] bg-night-850 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          {title && <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "default" | "warn" | "ok" | "danger" }) {
  const toneClass = { default: "text-ivory", warn: "text-warn", ok: "text-ok", danger: "text-danger" }[tone];
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">{label}</p>
      <p className={`mt-2 font-display text-4xl leading-none ${toneClass}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-mist">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-white/[0.08] bg-night-850 p-5 transition-colors";
  return href ? (
    <Link href={href} className={`${cls} hover:border-gold-500/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-mist">{children}</p>;
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between text-sm text-mist" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm">
          Suivant <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export const th = "px-3 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fog";
export const td = "px-3 py-3 align-top text-sm";
export const tableWrap = "overflow-x-auto rounded-2xl border border-white/[0.08] bg-night-850 scrollbar-thin";
export const rowClass = "border-t border-white/[0.06] hover:bg-white/[0.02]";
