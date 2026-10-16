import { AuthError, requireUser } from "@/lib/auth/session";
import { listPlayers } from "@/lib/admin/queries";
import { toCsv } from "@/lib/csv";
import { formatDateTime, zonedDateKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser("bookings.export");
    await requireUser("players.view");
  } catch (err) {
    return new Response(err instanceof AuthError ? err.message : "Accès refusé", { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const { rows } = await listPlayers(q, 1, { all: true });
  const csv = toCsv(
    ["Nom", "E-mail", "Téléphone", "Réservations", "Actives", "Présences", "No-shows", "Annulées/refusées", "Dernière réservation", "Notes"],
    rows.map((r) => [
      r.player.fullName,
      r.player.email,
      r.player.phone ?? "",
      r.total,
      r.active,
      r.attended,
      r.noShows,
      r.cancelled,
      r.lastBooking ? formatDateTime(new Date(r.lastBooking)) : "",
      r.player.notes,
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="joueurs-${zonedDateKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
