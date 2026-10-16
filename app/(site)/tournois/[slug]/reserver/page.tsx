import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublicTournament } from "@/lib/tournaments";
import { getSettings } from "@/lib/settings";
import { occupiedSeats } from "@/lib/bookings";
import { formatEntry, formatDateLong, formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { DateBlock } from "@/components/tournaments/TournamentCard";
import { CapacityBar, StatusBadge } from "@/components/tournaments/StatusBadge";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tm = await getPublicTournament(slug);
  return { title: tm ? `Réserver — ${tm.name}` : "Réservation", robots: { index: false } };
}

export default async function BookTournamentPage({ params }: Props) {
  const { slug } = await params;
  const tm = await getPublicTournament(slug);
  if (!tm) notFound();
  const a = tm.availability;
  const booking = await getSettings("booking");
  const playerSeats = tm.seatSelection === "player" && !a.waitlistOnly;
  const occupied = playerSeats ? await occupiedSeats(tm.id) : [];
  const maxPlaces = Math.max(1, Math.min(tm.maxPlacesPerBooking, a.waitlistOnly ? tm.maxPlacesPerBooking : a.seatsLeft));

  return (
    <section className="pb-24 pt-10 lg:pt-14">
      <div className="container-x">
        <Link href={`/tournois/${tm.slug}`} className="inline-flex items-center gap-2 text-sm text-mist hover:text-gold-300">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tm.name}
        </Link>
        <h1 className="mt-6 text-5xl leading-none text-ivory sm:text-6xl">{t.booking.title}</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div className="min-w-0">
            {tm.externalBookingUrl ? (
              <div className="surface p-8">
                <p className="text-lg text-mist">{t.detail.externalInfo}</p>
                <a href={tm.externalBookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-6">
                  {t.cta.external} ↗
                </a>
              </div>
            ) : a.canRequest ? (
              <BookingFlow
                tournament={{
                  id: tm.id,
                  slug: tm.slug,
                  name: tm.name,
                  dateLabel: formatDateLong(tm.startsAt),
                  timeLabel: formatTime(tm.startsAt),
                  buyInLabel: formatEntry(tm),
                  format: tm.format,
                  maxPlaces,
                  waitlistOnly: a.waitlistOnly,
                  playerSeats,
                  tableCount: tm.tableCount,
                  seatsPerTable: tm.seatsPerTable,
                  tableLabels: tm.tableLabels,
                }}
                occupied={occupied}
                requirePhone={booking.requirePhone}
                bookingTerms={booking.bookingTerms}
                cancellationPolicy={booking.cancellationPolicy}
                minimumAge={booking.minimumAge}
              />
            ) : (
              <div className="surface p-8">
                <StatusBadge state={a.state} />
                <p className="mt-4 text-lg text-mist">{t.booking.unavailable}</p>
                <Link href="/tournois" className="btn btn-outline mt-6">
                  {t.booking.backToCalendar}
                </Link>
              </div>
            )}
          </div>

          <aside className="order-first lg:order-none lg:sticky lg:top-28 lg:self-start">
            <div className="surface p-5">
              <div className="flex gap-4">
                <DateBlock date={tm.startsAt} />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.14em] text-gold-400">{tm.format}</p>
                  <p className="mt-1 font-display text-2xl leading-tight text-ivory">{tm.name}</p>
                  <p className="mt-1 text-sm text-mist">
                    {formatTime(tm.startsAt)} · {formatEntry(tm)}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-5">
                <StatusBadge state={a.state} />
                <CapacityBar taken={a.taken} capacity={a.capacity} state={a.state} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
