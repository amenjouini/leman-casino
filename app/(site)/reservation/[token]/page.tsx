import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, seatAssignments, tournaments } from "@/lib/db/schema";
import { verifyManageToken } from "@/lib/manage-link";
import { playerCanCancel } from "@/lib/bookings";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { seatLabel } from "@/lib/email/notifications";
import { formatDateLong, formatEntry, formatTime } from "@/lib/format";
import { CancelBookingForm, PublicProfileForm } from "@/components/booking/ManageForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ma réservation", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TONE: Record<string, string> = {
  pending: "border-warn/40 bg-warn/10 text-warn",
  confirmed: "border-ok/40 bg-ok/10 text-ok",
  waitlisted: "border-info/40 bg-info/10 text-info",
  attended: "border-gold-400/50 bg-gold-400/10 text-gold-300",
};

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyManageToken(decodeURIComponent(token));
  if (!id) notFound();
  const db = await getDb();
  const [row] = await db.select({ b: bookings, t: tournaments }).from(bookings).innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id)).where(eq(bookings.id, id)).limit(1);
  if (!row) notFound();
  const { b, t } = row;
  const seats = await db.select().from(seatAssignments).where(eq(seatAssignments.bookingId, b.id)).orderBy(asc(seatAssignments.tableNumber));
  const canCancel = playerCanCancel(b, t);
  const explanation: Record<string, string> = {
    pending: "Votre demande est en attente de confirmation par notre équipe. Votre place n’est pas encore garantie.",
    confirmed: "Votre place est confirmée. Présentez-vous à l’accueil avec une pièce d’identité.",
    waitlisted: "Le tournoi est complet : vous êtes sur liste d’attente. Nous vous contacterons si une place se libère.",
    cancelled: "Cette réservation est annulée.",
    rejected: "Cette demande n’a pas pu être acceptée.",
    attended: "Merci pour votre participation !",
    no_show: "Vous avez été noté absent à ce tournoi.",
  };

  return (
    <section className="pb-24 pt-10 lg:pt-14">
      <div className="container-x max-w-3xl">
        <p className="eyebrow">Espace joueur</p>
        <h1 className="mt-3 text-5xl text-ivory">Ma réservation</h1>

        <div className="surface mt-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-2xl tracking-[0.1em] text-gold-200">{b.reference}</p>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${TONE[b.status] ?? "border-white/15 text-mist"}`}>{BOOKING_STATUS_LABELS[b.status]}</span>
          </div>
          <p className="mt-4 text-mist">{explanation[b.status]}</p>
          <dl className="mt-6 grid gap-4 border-t border-white/[0.07] pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fog">Tournoi</dt>
              <dd>
                <Link href={`/tournois/${t.slug}`} className="text-ivory hover:text-gold-300">
                  {t.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-fog">Date</dt>
              <dd className="text-ivory first-letter:uppercase">
                {formatDateLong(t.startsAt)} · {formatTime(t.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-fog">Joueur</dt>
              <dd className="text-ivory">{b.fullName}</dd>
            </div>
            <div>
              <dt className="text-fog">Places</dt>
              <dd className="text-ivory">{b.places}</dd>
            </div>
            <div>
              <dt className="text-fog">Buy-in</dt>
              <dd className="text-ivory">{formatEntry(t)}</dd>
            </div>
            <div>
              <dt className="text-fog">Sièges</dt>
              <dd className="text-ivory">{seats.length ? seats.map((s) => seatLabel(t, s.tableNumber, s.seatNumber)).join(", ") : "Attribués par l’équipe"}</dd>
            </div>
          </dl>
        </div>

        {["pending", "confirmed", "waitlisted"].includes(b.status) && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="surface p-6">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Liste des inscrits</h2>
              <p className="mb-4 mt-1 text-xs text-fog">Votre nom n’est jamais publié ; seul un pseudo peut apparaître, si vous le souhaitez.</p>
              <PublicProfileForm token={decodeURIComponent(token)} publicName={b.publicName ?? ""} showPublicly={b.showPublicly} />
            </div>
            <div className="surface p-6">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Annulation</h2>
              {canCancel ? (
                <>
                  <p className="mb-4 mt-1 text-sm text-mist">Un empêchement ? Libérez votre place en un clic : elle sera proposée à la liste d’attente.</p>
                  <CancelBookingForm token={decodeURIComponent(token)} />
                </>
              ) : (
                <p className="mt-1 text-sm text-mist">Le tournoi a commencé : contactez-nous directement.</p>
              )}
            </div>
          </div>
        )}
        <p className="mt-8 text-xs text-fog">Ce lien est personnel : ne le partagez pas.</p>
      </div>
    </section>
  );
}
