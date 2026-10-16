import { NextResponse, after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { bookingRequestSchema, fieldErrors } from "@/lib/validation";
import { BookingError, createBooking } from "@/lib/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFrom, isSameOrigin } from "@/lib/request";
import { notifyOwnerOfBooking, seatLabel, sendBookingEmail } from "@/lib/email/notifications";
import { getDb } from "@/lib/db";
import { emailLog } from "@/lib/db/schema";
import { formatDateLong, formatTime } from "@/lib/format";
import { manageToken } from "@/lib/manage-link";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  CLOSED: 409,
  FULL: 409,
  NOT_ENOUGH_SEATS: 409,
  DUPLICATE: 409,
  SEAT_TAKEN: 409,
  SEAT_INVALID: 422,
  SEATS_REQUIRED: 422,
  TOO_MANY_PLACES: 422,
  PHONE_REQUIRED: 422,
  IDEMPOTENCY_MISMATCH: 409,
};

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Origine de la requête non autorisée." }, { status: 403 });
  }
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 16_000) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });

  const ip = clientIpFrom(req.headers);
  const limit = await rateLimit(`booking:${ip}`, 10, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de demandes depuis votre connexion. Merci de réessayer plus tard.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Certains champs sont invalides.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  try {
    const result = await createBooking(parsed.data);
    const { booking, tournament, seats, replayed } = result;

    let emailStatus: "sent" | "failed" | "skipped";
    if (replayed) {
      const db = await getDb();
      const [last] = await db
        .select({ status: emailLog.status })
        .from(emailLog)
        .where(and(eq(emailLog.bookingId, booking.id), eq(emailLog.recipient, booking.email)))
        .orderBy(desc(emailLog.createdAt))
        .limit(1);
      emailStatus = last?.status ?? "skipped";
    } else {
      const template = booking.status === "waitlisted" ? "booking_waitlisted" : "booking_received";
      emailStatus = (await sendBookingEmail(booking.id, template)).status;
      after(async () => {
        await notifyOwnerOfBooking(booking.id);
      });
    }

    return NextResponse.json(
      {
        reference: booking.reference,
        status: booking.status,
        places: booking.places,
        email: booking.email,
        tournament: { name: tournament.name, date: formatDateLong(tournament.startsAt), time: formatTime(tournament.startsAt) },
        seats: seats.map((s) => seatLabel(tournament, s.table, s.seat)),
        emailStatus,
        manageUrl: manageToken(booking.id) ? `/reservation/${manageToken(booking.id)}` : null,
      },
      { status: replayed ? 200 : 201 },
    );
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: ERROR_STATUS[err.code] ?? 400 });
    }
    console.error("[bookings] erreur", err);
    return NextResponse.json({ error: "Une erreur est survenue. Veuillez réessayer." }, { status: 500 });
  }
}
