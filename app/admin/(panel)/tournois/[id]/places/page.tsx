import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getTournamentById } from "@/lib/tournaments";
import { tournamentRoster } from "@/lib/admin/queries";
import { CAPACITY_STATUSES } from "@/lib/constants";
import { formatDateLong, formatTime } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/ui";
import { SeatingBoard } from "@/components/admin/SeatingBoard";

export const metadata = { title: "Placement" };

export default async function SeatingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("tournaments.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = await getTournamentById(id);
  if (!t) notFound();
  const roster = (await tournamentRoster(id)).filter((b) => CAPACITY_STATUSES.includes(b.status));
  const seated = roster.reduce((n, r) => n + r.seats.length, 0);

  return (
    <>
      <AdminPageHeader
        title={`Placement · ${t.name}`}
        description={`${formatDateLong(t.startsAt)} à ${formatTime(t.startsAt)} — ${t.tableCount} table(s) × ${t.seatsPerTable} sièges · ${seated} siège(s) attribué(s) · ${t.availability.taken}/${t.capacity} places réservées.`}
        back={{ href: `/admin/tournois/${t.id}`, label: "Tournoi" }}
      />
      <SeatingBoard
        tournamentId={t.id}
        tableCount={t.tableCount}
        seatsPerTable={t.seatsPerTable}
        labels={t.tableLabels}
        readOnly={!can(user.role, "bookings.manage")}
        roster={roster.map((r) => ({ id: r.id, reference: r.reference, fullName: r.fullName, places: r.places, status: r.status, seats: r.seats }))}
      />
    </>
  );
}
