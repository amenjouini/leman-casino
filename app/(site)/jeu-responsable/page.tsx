import type { Metadata } from "next";
import { getAllPublicSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jeu responsable", alternates: { canonical: "/jeu-responsable" } };

const RESOURCES = [
  { name: "Addiction Suisse", href: "https://www.addictionsuisse.ch", text: "Information et conseils sur les addictions, dont le jeu excessif." },
  { name: "Jeu excessif (Suisse romande)", href: "https://www.jeu-excessif.ch", text: "Programme intercantonal de prévention : tests, conseils et adresses d’aide." },
];

export default async function ResponsibleGamingPage() {
  const { legal, booking } = await getAllPublicSettings();
  return (
    <LegalPage title="Jeu responsable" text={legal.responsibleGaming}>
      {booking.minimumAge > 0 && (
        <p className="mt-8 flex items-center gap-3 text-ivory-dim">
          <span className="inline-flex h-10 min-w-12 items-center justify-center rounded-lg border border-gold-500/40 px-2 font-semibold text-gold-300">{booking.minimumAge}+</span>
          Les tournois sont réservés aux personnes âgées de {booking.minimumAge} ans et plus.
        </p>
      )}
      <h2 className="mt-14 text-3xl text-ivory">Obtenir de l’aide</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <li key={r.href} className="surface p-6">
            <a href={r.href} target="_blank" rel="noopener noreferrer" className="font-display text-2xl text-ivory hover:text-gold-300">
              {r.name}
            </a>
            <p className="mt-2 text-sm text-mist">{r.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-fog">La roulette proposée sur ce site est une simulation de divertissement : elle ne permet ni de miser ni de gagner de l’argent.</p>
    </LegalPage>
  );
}
