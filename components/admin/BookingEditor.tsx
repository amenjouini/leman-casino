"use client";

import { useState } from "react";
import { resendEmailAction, setSeatsAction, updateBookingAction } from "@/lib/admin/actions/bookings";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email/templates-meta";
import { TableLayout, tableLabel } from "@/components/booking/TableLayout";
import { ActionForm, FormMessage, SubmitButton, useFormAction } from "./ActionForm";

type Seat = { table: number; seat: number };

export function BookingEditForm({ booking }: { booking: { id: string; fullName: string; email: string; phone: string; places: number; message: string; staffNote: string } }) {
  const [state, onSubmit, pending] = useFormAction(updateBookingAction);
  const e = state.fields ?? {};
  const input = (name: keyof typeof booking, label: string, type = "text") => (
    <div>
      <label htmlFor={`b-${name}`} className="field-label">
        {label}
      </label>
      <input id={`b-${name}`} name={name} type={type} defaultValue={String(booking[name])} className="field" aria-invalid={!!e[name]} />
      {e[name] && <p className="field-error">{e[name]}</p>}
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="bookingId" value={booking.id} />
      {input("fullName", "Nom complet")}
      {input("email", "E-mail", "email")}
      {input("phone", "Téléphone", "tel")}
      {input("places", "Places", "number")}
      <div className="sm:col-span-2">
        <label htmlFor="b-message" className="field-label">
          Message du joueur
        </label>
        <textarea id="b-message" name="message" defaultValue={booking.message} className="field min-h-20" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="b-staffNote" className="field-label">
          Note interne (non visible par le joueur)
        </label>
        <textarea id="b-staffNote" name="staffNote" defaultValue={booking.staffNote} className="field min-h-20" />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function SeatPickerAdmin({
  bookingId,
  places,
  tableCount,
  seatsPerTable,
  labels,
  current,
  occupiedByOthers,
}: {
  bookingId: string;
  places: number;
  tableCount: number;
  seatsPerTable: number;
  labels: string[];
  current: Seat[];
  occupiedByOthers: Seat[];
}) {
  const [seats, setSeats] = useState<Seat[]>(current);
  const others = new Set(occupiedByOthers.map((s) => `${s.table}:${s.seat}`));
  const mine = new Set(seats.map((s) => `${s.table}:${s.seat}`));
  return (
    <ActionForm action={setSeatsAction} hidden={{ bookingId, seats: seats.map((s) => `${s.table}:${s.seat}`).join(",") }} label="Enregistrer les sièges" buttonClass="btn btn-gold btn-sm mt-4">
      <p className="mb-3 text-sm text-mist">
        {seats.length}/{places} siège(s) sélectionné(s){seats.length ? ` : ${seats.map((s) => `${tableLabel(labels, s.table)} · ${s.seat}`).join(", ")}` : ""}.
      </p>
      <div className="max-h-[30rem] overflow-y-auto pr-1 scrollbar-thin">
        <TableLayout
          compact
          tableCount={tableCount}
          seatsPerTable={seatsPerTable}
          labels={labels}
          onSeatClick={(table, seat) => {
            const key = `${table}:${seat}`;
            if (others.has(key)) return;
            setSeats((cur) =>
              mine.has(key) ? cur.filter((s) => `${s.table}:${s.seat}` !== key) : cur.length >= places ? [...cur.slice(1), { table, seat }] : [...cur, { table, seat }],
            );
          }}
          seat={(table, seat) => {
            const key = `${table}:${seat}`;
            const name = `${tableLabel(labels, table)}, siège ${seat}`;
            if (mine.has(key)) return { status: "selected", title: `${name} — sélectionné` };
            if (others.has(key)) return { status: "taken", title: `${name} — occupé`, disabled: true };
            return { status: "free", title: `${name} — libre` };
          }}
        />
      </div>
      {seats.length > 0 && (
        <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setSeats([])}>
          Tout libérer
        </button>
      )}
    </ActionForm>
  );
}

export function ResendEmailForm({ bookingId, suggested }: { bookingId: string; suggested: EmailTemplateKey | null }) {
  const options = (Object.keys(EMAIL_TEMPLATE_LABELS) as EmailTemplateKey[]).filter((k) => !k.startsWith("owner_"));
  return (
    <ActionForm action={resendEmailAction} hidden={{ bookingId }} label="Envoyer l'e-mail" buttonClass="btn btn-outline btn-sm mt-3" className="space-y-3">
      <div>
        <label htmlFor="tpl" className="field-label">
          Modèle
        </label>
        <select id="tpl" name="template" defaultValue={suggested ?? "booking_confirmed"} className="field">
          {options.map((k) => (
            <option key={k} value={k}>
              {EMAIL_TEMPLATE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="tpl-note" className="field-label">
          Note insérée dans l’e-mail (facultatif, {"{{note}}"})
        </label>
        <textarea id="tpl-note" name="note" className="field min-h-16" maxLength={1000} />
      </div>
    </ActionForm>
  );
}
