"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Hourglass, Minus, Plus } from "lucide-react";
import { t } from "@/lib/i18n";
import { bookingRequestSchema } from "@/lib/validation";
import { TableLayout, tableLabel } from "./TableLayout";

export type BookingFlowTournament = {
  id: string;
  slug: string;
  name: string;
  dateLabel: string;
  timeLabel: string;
  buyInLabel: string;
  format: string;
  maxPlaces: number;
  waitlistOnly: boolean;
  playerSeats: boolean;
  tableCount: number;
  seatsPerTable: number;
  tableLabels: string[];
};

type Seat = { table: number; seat: number };
type Success = {
  reference: string;
  status: "pending" | "waitlisted";
  places: number;
  email: string;
  seats: string[];
  emailStatus: "sent" | "failed" | "skipped";
  manageUrl: string | null;
};

const infoSchema = bookingRequestSchema.pick({ fullName: true, email: true, phone: true, message: true, publicName: true });

export function BookingFlow({
  tournament: tm,
  occupied: initialOccupied,
  requirePhone,
  bookingTerms,
  cancellationPolicy,
  minimumAge,
}: {
  tournament: BookingFlowTournament;
  occupied: Seat[];
  requirePhone: boolean;
  bookingTerms: string;
  cancellationPolicy: string;
  minimumAge: number;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", message: "", publicName: "" });
  const [showPublicly, setShowPublicly] = useState(false);
  const [places, setPlaces] = useState(1);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [occupied, setOccupied] = useState<Seat[]>(initialOccupied);
  const [accept, setAccept] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const keyRef = useRef<string>("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    keyRef.current = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, success]);

  const occupiedSet = useMemo(() => new Set(occupied.map((s) => `${s.table}:${s.seat}`)), [occupied]);
  const selectedSet = useMemo(() => new Set(seats.map((s) => `${s.table}:${s.seat}`)), [seats]);
  const steps = t.booking.steps;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  const validateInfo = () => {
    const res = infoSchema.safeParse(form);
    const errs: Record<string, string> = {};
    if (!res.success) for (const i of res.error.issues) errs[String(i.path[0])] ??= i.message;
    if (requirePhone && !form.phone.trim()) errs.phone = t.booking.required;
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`bk-${Object.keys(errs)[0]}`)?.focus();
      return false;
    }
    return true;
  };

  const validatePlaces = () => {
    if (tm.playerSeats && seats.length !== places) {
      setErrors({ seats: t.booking.seatsHelp(places) });
      return false;
    }
    setErrors({});
    return true;
  };

  const go = (next: number) => {
    setServerError(null);
    if (next > step) {
      if (step === 0 && !validateInfo()) return;
      if (step === 1 && !validatePlaces()) return;
    }
    setStep(next);
  };

  const toggleSeat = (table: number, seat: number) => {
    const key = `${table}:${seat}`;
    if (occupiedSet.has(key)) return;
    setErrors({});
    setSeats((cur) => {
      if (cur.some((s) => s.table === table && s.seat === seat)) return cur.filter((s) => !(s.table === table && s.seat === seat));
      if (cur.length >= places) return [...cur.slice(1), { table, seat }];
      return [...cur, { table, seat }];
    });
  };

  const changePlaces = (n: number) => {
    const v = Math.max(1, Math.min(tm.maxPlaces, n));
    setPlaces(v);
    setSeats((cur) => cur.slice(0, v));
  };

  const refreshSeats = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tm.id}/seats`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { occupied: Seat[] };
        setOccupied(data.occupied);
        const taken = new Set(data.occupied.map((s) => `${s.table}:${s.seat}`));
        setSeats((cur) => cur.filter((s) => !taken.has(`${s.table}:${s.seat}`)));
      }
    } catch {
      /* keep current view */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!accept) {
      setErrors({ acceptTerms: "Veuillez accepter les conditions de réservation." });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tm.id,
          ...form,
          showPublicly: showPublicly && !!form.publicName.trim(),
          places,
          seats: tm.playerSeats ? seats : [],
          idempotencyKey: keyRef.current,
          acceptTerms: true,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(data as Success);
        return;
      }
      if (res.status === 429) setServerError(t.booking.rateLimited);
      else if (data.fields) {
        setErrors(data.fields);
        const firstStepWithError = ["fullName", "email", "phone", "message", "publicName"].some((k) => data.fields[k]) ? 0 : 1;
        setStep(firstStepWithError);
        setServerError(data.error ?? t.booking.genericError);
      } else {
        setServerError(data.error ?? t.booking.genericError);
        if (data.code === "SEAT_TAKEN") {
          await refreshSeats();
          setStep(1);
        }
        if (data.code === "NOT_ENOUGH_SEATS" || data.code === "TOO_MANY_PLACES") setStep(1);
      }
    } catch {
      setServerError(t.booking.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────────────────────── Success screen ───────────────────────────── */
  if (success) {
    const waitlisted = success.status === "waitlisted";
    return (
      <div className="surface p-6 sm:p-10">
        <div className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${waitlisted ? "bg-warn/15 text-warn" : "bg-gold-400/15 text-gold-300"}`}>
          {waitlisted ? <Hourglass className="h-7 w-7" aria-hidden /> : <CheckCircle2 className="h-7 w-7" aria-hidden />}
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-4xl text-ivory outline-none">
          {waitlisted ? t.booking.waitlistTitle : t.booking.pendingTitle}
        </h2>
        <p className="mt-3 max-w-xl text-mist">{waitlisted ? t.booking.waitlistText : t.booking.pendingText}</p>

        <div className="mt-8 rounded-2xl border border-gold-500/30 bg-night-950 p-6">
          <p className="eyebrow">{t.booking.reference}</p>
          <p className="mt-2 font-mono text-3xl tracking-[0.12em] text-gold-200 sm:text-4xl">{success.reference}</p>
          <p className="mt-2 text-sm text-mist">{t.booking.keepReference}</p>
          <dl className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fog">Tournoi</dt>
              <dd className="text-ivory">{tm.name}</dd>
            </div>
            <div>
              <dt className="text-fog">Date</dt>
              <dd className="text-ivory first-letter:uppercase">
                {tm.dateLabel} · {tm.timeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-fog">{t.booking.places}</dt>
              <dd className="text-ivory">{success.places}</dd>
            </div>
            <div>
              <dt className="text-fog">Statut</dt>
              <dd className={waitlisted ? "text-warn" : "text-gold-300"}>{waitlisted ? "Liste d'attente" : "En attente de confirmation"}</dd>
            </div>
            {success.seats.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-fog">Sièges demandés</dt>
                <dd className="text-ivory">{success.seats.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>

        <p
          className={`mt-6 flex gap-3 rounded-xl border p-4 text-sm ${
            success.emailStatus === "sent" ? "border-ok/30 bg-ok/[0.06] text-ok" : "border-warn/30 bg-warn/[0.06] text-warn"
          }`}
        >
          {success.emailStatus === "sent" ? <Check className="h-5 w-5 shrink-0" aria-hidden /> : <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />}
          {success.emailStatus === "sent" ? t.booking.emailSent(success.email) : success.emailStatus === "failed" ? t.booking.emailFailed : t.booking.emailDisabled}
        </p>

        {success.manageUrl && (
          <div className="mt-6 rounded-xl border border-gold-500/25 bg-gold-400/[0.05] p-4 text-sm">
            <p className="text-ivory-dim">Votre lien personnel pour suivre ou annuler cette réservation :</p>
            <Link href={success.manageUrl} className="mt-2 inline-flex font-semibold text-gold-300 underline underline-offset-4">
              Gérer ma réservation
            </Link>
            <p className="mt-1 text-xs text-fog">Gardez ce lien privé : il permet d’annuler la réservation. Il figure aussi dans l’e-mail de confirmation.</p>
          </div>
        )}

        <div className="mt-8">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-ivory-dim">{t.booking.nextSteps}</h3>
          <ol className="mt-4 space-y-3">
            {t.booking.nextStepsList.map((s, i) => (
              <li key={s} className="flex gap-3 text-mist">
                <span className="font-display text-xl leading-none text-gold-400">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <Link href="/tournois" className="btn btn-outline mt-10">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.booking.backToCalendar}
        </Link>
      </div>
    );
  }

  /* ─────────────────────────────── Form steps ─────────────────────────────── */
  const fieldErr = (k: string) =>
    errors[k] ? (
      <p id={`bk-${k}-err`} className="field-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={
        step === 2
          ? submit
          : (e) => {
              e.preventDefault();
              go(step + 1);
            }
      }
      noValidate
      className="surface relative p-5 sm:p-8"
    >
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Étapes de la réservation">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <div className={`h-1 rounded-full ${i <= step ? "bg-gold-400" : "bg-white/10"}`} />
            <p className={`mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${i === step ? "text-gold-300" : i < step ? "text-ivory-dim" : "text-fog"}`}>
              <span className="mr-1">{i + 1}.</span>
              <span className="hidden sm:inline">{label}</span>
            </p>
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="text-3xl text-ivory outline-none">
        {steps[step]}
      </h2>

      {tm.waitlistOnly && <p className="mt-4 rounded-lg border border-warn/30 bg-warn/[0.07] p-3 text-sm text-warn">{t.booking.waitlistNotice}</p>}

      {serverError && (
        <div role="alert" className="mt-5 flex gap-3 rounded-lg border border-danger/40 bg-danger/[0.08] p-3 text-sm text-danger">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      {/* Honeypot (hidden from people and assistive tech) */}
      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label>
          Site web
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {step === 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="bk-fullName" className="field-label">
              {t.booking.fullName} <span className="text-gold-400">*</span>
            </label>
            <input
              id="bk-fullName"
              className="field"
              autoComplete="name"
              value={form.fullName}
              onChange={set("fullName")}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "bk-fullName-err" : undefined}
              maxLength={100}
              required
            />
            {fieldErr("fullName")}
          </div>
          <div>
            <label htmlFor="bk-email" className="field-label">
              {t.booking.email} <span className="text-gold-400">*</span>
            </label>
            <input
              id="bk-email"
              type="email"
              inputMode="email"
              className="field"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "bk-email-err" : undefined}
              maxLength={200}
              required
            />
            {fieldErr("email")}
          </div>
          <div>
            <label htmlFor="bk-phone" className="field-label">
              {requirePhone ? (
                <>
                  {t.booking.phone} <span className="text-gold-400">*</span>
                </>
              ) : (
                t.booking.phoneOptional
              )}
            </label>
            <input
              id="bk-phone"
              type="tel"
              inputMode="tel"
              className="field"
              autoComplete="tel"
              placeholder="+41 …"
              value={form.phone}
              onChange={set("phone")}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "bk-phone-err" : undefined}
              maxLength={25}
              required={requirePhone}
            />
            {fieldErr("phone")}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-night-950/50 p-4 sm:col-span-2">
            <label htmlFor="bk-publicName" className="field-label">
              Pseudo (facultatif)
            </label>
            <input
              id="bk-publicName"
              className="field"
              value={form.publicName}
              onChange={set("publicName")}
              maxLength={30}
              placeholder="ex. AceDuLéman"
              aria-invalid={!!errors.publicName}
              autoComplete="nickname"
            />
            {fieldErr("publicName")}
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-ivory-dim">
              <input
                type="checkbox"
                checked={showPublicly}
                onChange={(e) => setShowPublicly(e.target.checked)}
                disabled={!form.publicName.trim()}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-gold-400)] disabled:opacity-40"
              />
              <span>
                Afficher mon pseudo dans la liste publique des inscrits une fois ma place confirmée.
                <span className="block text-xs text-fog">Sinon, vous apparaissez comme joueur anonyme. Votre nom et vos coordonnées ne sont jamais publiés.</span>
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bk-message" className="field-label">
              {t.booking.message}
            </label>
            <textarea id="bk-message" className="field min-h-28" value={form.message} onChange={set("message")} maxLength={1000} aria-invalid={!!errors.message} />
            {fieldErr("message")}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-8">
          <div>
            <span className="field-label" id="bk-places-label">
              {t.booking.places}
            </span>
            <div className="inline-flex items-center gap-3" role="group" aria-labelledby="bk-places-label">
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 hover:border-gold-400 disabled:opacity-40" onClick={() => changePlaces(places - 1)} disabled={places <= 1} aria-label="Une place de moins">
                <Minus className="h-4 w-4" />
              </button>
              <output className="w-10 text-center font-display text-3xl text-ivory" aria-live="polite">
                {places}
              </output>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 hover:border-gold-400 disabled:opacity-40" onClick={() => changePlaces(places + 1)} disabled={places >= tm.maxPlaces} aria-label="Une place de plus">
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-sm text-mist">max. {tm.maxPlaces}</span>
            </div>
          </div>

          {tm.playerSeats ? (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">{t.booking.seatsTitle}</h3>
              <p className="mt-1 text-sm text-mist">
                {t.booking.seatsHelp(places)} ({seats.length}/{places})
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-mist">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border border-gold-500/50 bg-night-900" /> {t.booking.seatFree}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-gold-400" /> {t.booking.seatMine}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-white/10" /> {t.booking.seatTaken}
                </span>
              </div>
              {errors.seats && (
                <p className="field-error" role="alert">
                  {errors.seats}
                </p>
              )}
              <div className="mt-5 max-h-[34rem] overflow-y-auto pr-1 scrollbar-thin">
                <TableLayout
                  tableCount={tm.tableCount}
                  seatsPerTable={tm.seatsPerTable}
                  labels={tm.tableLabels}
                  onSeatClick={toggleSeat}
                  seat={(table, seat) => {
                    const key = `${table}:${seat}`;
                    const name = `${tableLabel(tm.tableLabels, table)}, siège ${seat}`;
                    if (selectedSet.has(key)) return { status: "selected", title: `${name} — ${t.booking.seatMine}` };
                    if (occupiedSet.has(key)) return { status: "taken", title: `${name} — ${t.booking.seatTaken}`, disabled: true };
                    return { status: "free", title: `${name} — ${t.booking.seatFree}` };
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.08] bg-night-950/60 p-4 text-sm text-mist">{t.booking.seatsOwner}</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-6">
          <dl className="grid gap-x-8 gap-y-4 rounded-2xl border border-white/[0.08] bg-night-950/60 p-5 text-sm sm:grid-cols-2">
            {[
              ["Tournoi", tm.name],
              ["Date et heure", `${tm.dateLabel} · ${tm.timeLabel}`],
              [t.booking.places, String(places)],
              [t.common.buyIn, tm.buyInLabel],
              ["Nom", form.fullName],
              ["E-mail", form.email],
              ...(form.phone ? [["Téléphone", form.phone]] : []),
              ...(form.publicName ? [["Pseudo", `${form.publicName} — ${showPublicly ? "visible dans la liste" : "non affiché (anonyme)"}`]] : []),
              ...(tm.playerSeats && !tm.waitlistOnly ? [["Sièges", seats.map((s) => `${tableLabel(tm.tableLabels, s.table)} · siège ${s.seat}`).join(", ")]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-fog">{k}</dt>
                <dd className="mt-0.5 break-words text-ivory first-letter:uppercase">{v}</dd>
              </div>
            ))}
            {form.message && (
              <div className="sm:col-span-2">
                <dt className="text-fog">Message</dt>
                <dd className="mt-0.5 whitespace-pre-line text-ivory-dim">{form.message}</dd>
              </div>
            )}
          </dl>

          {(bookingTerms || cancellationPolicy) && (
            <div className="space-y-3 text-sm leading-relaxed text-mist">
              {bookingTerms && (
                <p>
                  <strong className="text-ivory-dim">{t.booking.terms} : </strong>
                  {bookingTerms}
                </p>
              )}
              {cancellationPolicy && (
                <p>
                  <strong className="text-ivory-dim">{t.booking.cancellation} : </strong>
                  {cancellationPolicy}
                </p>
              )}
            </div>
          )}
          {minimumAge > 0 && <p className="text-sm text-mist">{t.booking.ageNotice(minimumAge)}</p>}

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ivory-dim">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => {
                  setAccept(e.target.checked);
                  setErrors({});
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-gold-400)]"
                aria-invalid={!!errors.acceptTerms}
              />
              <span>
                {t.booking.accept}{" "}
                <Link href="/confidentialite" target="_blank" className="text-gold-300 underline underline-offset-2">
                  ({t.footer.privacy})
                </Link>
              </span>
            </label>
            {fieldErr("acceptTerms")}
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.booking.previous}
          </button>
        ) : (
          <Link href={`/tournois/${tm.slug}`} className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.common.back}
          </Link>
        )}
        {step < 2 ? (
          <button type="submit" className="btn btn-gold">
            {t.booking.next}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="submit" className="btn btn-gold" disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-night-950/30 border-t-night-950" aria-hidden />
                {t.booking.submitting}
              </>
            ) : tm.waitlistOnly ? (
              t.booking.submitWaitlist
            ) : (
              t.booking.submit
            )}
          </button>
        )}
      </div>
    </form>
  );
}
