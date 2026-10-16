import { requirePageUser } from "@/lib/auth/session";
import { EMPTY_TOURNAMENT } from "@/lib/admin/tournament-values";
import { AdminPageHeader } from "@/components/admin/ui";
import { TournamentForm } from "@/components/admin/TournamentForm";

export const metadata = { title: "Nouveau tournoi" };

export default async function NewTournamentPage() {
  await requirePageUser("tournaments.manage");
  return (
    <>
      <AdminPageHeader title="Nouveau tournoi" description="Le tournoi est créé en brouillon par défaut : publiez-le quand il est prêt." back={{ href: "/admin/tournois", label: "Tournois" }} />
      <TournamentForm initial={EMPTY_TOURNAMENT} />
    </>
  );
}
