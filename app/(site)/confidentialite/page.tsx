import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default async function PrivacyPage() {
  const [legal, site] = await Promise.all([getSettings("legal"), getSettings("site")]);
  return (
    <LegalPage
      title="Politique de confidentialité"
      text={legal.privacyPolicy}
      fallback={
        <div className="prose-leman">
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-sm">
            La politique de confidentialité complète est en cours de rédaction par l’établissement. Les informations ci-dessous décrivent le fonctionnement technique du
            formulaire de réservation.
          </p>
          <h2>Données collectées lors d’une réservation</h2>
          <ul>
            <li>Nom complet et adresse e-mail (obligatoires).</li>
            <li>Numéro de téléphone (si demandé) et message facultatif.</li>
            <li>Tournoi choisi, nombre de places, sièges éventuels et statut de la réservation.</li>
          </ul>
          <h2>Utilisation</h2>
          <p>
            Ces données servent uniquement à traiter votre demande de réservation, à vous informer de son statut et à organiser l’accueil le jour du tournoi. Aucune donnée
            bancaire n’est collectée sur ce site.
          </p>
          <h2>Vos droits</h2>
          <p>
            Pour consulter, corriger ou supprimer vos données, contactez {site.casinoName}
            {site.email ? ` à l’adresse ${site.email}` : ""}.
          </p>
          <h2>Stockage local</h2>
          <p>
            Le site n’utilise pas de cookies publicitaires. Un cookie technique est utilisé uniquement pour l’espace d’administration de l’équipe, et l’historique de la
            roulette est conservé dans votre navigateur le temps de votre visite.
          </p>
        </div>
      }
    />
  );
}
