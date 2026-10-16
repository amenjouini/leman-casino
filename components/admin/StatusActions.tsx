"use client";

import { useState } from "react";
import type { BookingStatus } from "@/lib/db/schema";
import { changeStatusAction } from "@/lib/admin/actions/bookings";
import { FormMessage, useFormAction } from "./ActionForm";

const LABEL: Record<BookingStatus, string> = {
  pending: "Remettre en attente",
  confirmed: "Confirmer",
  waitlisted: "Liste d'attente",
  cancelled: "Annuler",
  rejected: "Refuser",
  attended: "Présent",
  no_show: "Absent",
};
const STYLE: Partial<Record<BookingStatus, string>> = {
  confirmed: "btn btn-gold btn-sm",
  attended: "btn btn-gold btn-sm",
  rejected: "btn btn-sm border border-danger/50 text-danger hover:bg-danger/10",
  cancelled: "btn btn-sm border border-danger/40 text-danger hover:bg-danger/10",
  no_show: "btn btn-sm border border-danger/40 text-danger hover:bg-danger/10",
};
const CONFIRM: Partial<Record<BookingStatus, string>> = {
  rejected: "Refuser cette demande ?",
  cancelled: "Annuler cette réservation ? Ses sièges seront libérés.",
};
const NOTIFIABLE: BookingStatus[] = ["confirmed", "waitlisted", "rejected", "cancelled", "pending"];

function Buttons({ allowed, pending }: { allowed: BookingStatus[]; pending: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((s) => (
        <button
          key={s}
          type="submit"
          name="status"
          value={s}
          disabled={pending}
          className={STYLE[s] ?? "btn btn-outline btn-sm"}
        >
          {LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function StatusActions({ bookingId, allowed, canNotify, compact = false }: { bookingId: string; allowed: BookingStatus[]; canNotify: boolean; compact?: boolean }) {
  const [state, onSubmit, pending] = useFormAction(changeStatusAction, {
    confirm: (submitter) => CONFIRM[(submitter as HTMLButtonElement | null)?.value as BookingStatus],
  });
  const [showNote, setShowNote] = useState(false);
  if (!allowed.length) return <p className="text-sm text-fog">Aucune action disponible.</p>;
  const notifiable = canNotify && allowed.some((s) => NOTIFIABLE.includes(s));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      {!compact && showNote && (
        <div>
          <label htmlFor={`note-${bookingId}`} className="field-label">
            Note (journal et e-mail de refus/annulation)
          </label>
          <textarea id={`note-${bookingId}`} name="note" className="field min-h-20" maxLength={1000} />
        </div>
      )}
      <Buttons allowed={allowed} pending={pending} />
      {(notifiable || !compact) && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {notifiable && (
            <label className="inline-flex items-center gap-2 text-ivory-dim">
              <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-[var(--color-gold-400)]" />
              Informer le joueur par e-mail
            </label>
          )}
          {!compact && !showNote && (
            <button type="button" className="text-mist underline-offset-2 hover:text-gold-300 hover:underline" onClick={() => setShowNote(true)}>
              Ajouter une note
            </button>
          )}
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
