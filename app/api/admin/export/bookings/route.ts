import { AuthError, requireUser } from "@/lib/auth/session";
import { listBookings } from "@/lib/admin/queries";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { formatDateTime, zonedDateKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser("bookings.export");
  } catch (err) {
    return new Response(err instanceof AuthError ? err.message : "Accès refusé", { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const { rows } = await listBookings(
    { q: sp.get("q") ?? "", status: sp.get("statut") ?? "", tournament: sp.get("tournoi") ?? "", from: sp.get("du") ?? "", to: sp.get("au") ?? "" },
    { all: true },
  );
  const csv = toCsv(
    ["Référence", "Statut", "Tournoi", "Date du tournoi", "Nom", "E-mail", "Téléphone", "Places", "Sièges", "Message", "Note interne", "Créée le", "Confirmée le", "Pointée le"],
    rows.map(({ booking: b, tournamentName, startsAt, seats }) => [
      b.reference,
      BOOKING_STATUS_LABELS[b.status],
      tournamentName,
      formatDateTime(startsAt),
      b.fullName,
      b.email,
      b.phone ?? "",
      b.places,
      seats
        .split(",")
        .filter(Boolean)
        .map((s) => `T${s.split(":")[0]}-S${s.split(":")[1]}`)
        .join(" "),
      b.message,
      b.staffNote,
      formatDateTime(b.createdAt),
      b.confirmedAt ? formatDateTime(b.confirmedAt) : "",
      b.checkedInAt ? formatDateTime(b.checkedInAt) : "",
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations-${zonedDateKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
