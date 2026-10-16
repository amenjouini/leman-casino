import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { AdminPageHeader } from "@/components/admin/ui";
import { BookingSettingsForm, LegalSettingsForm, SiteSettingsForm } from "@/components/admin/SettingsForms";

export const metadata = { title: "Paramètres" };

const TABS = [
  ["site", "Site & coordonnées"],
  ["reservation", "Réservations"],
  ["legal", "Textes légaux"],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  await requirePageUser("settings.manage");
  const { onglet } = await searchParams;
  const tab = TABS.find(([k]) => k === onglet)?.[0] ?? "site";
  const [site, booking, legal] = await Promise.all([getSettings("site"), getSettings("booking"), getSettings("legal")]);

  return (
    <>
      <AdminPageHeader title="Paramètres du site" description="Informations publiques de l’établissement, règles de réservation et textes légaux. Les e-mails se règlent dans la page E-mails." />
      <nav className="mb-6 flex flex-wrap gap-1" aria-label="Sections">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/parametres?onglet=${k}`}
            aria-current={k === tab ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm ${k === tab ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:bg-white/[0.05]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "site" && <SiteSettingsForm value={site} />}
      {tab === "reservation" && <BookingSettingsForm value={booking} />}
      {tab === "legal" && <LegalSettingsForm value={legal} />}
    </>
  );
}
