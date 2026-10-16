import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default async function LegalNoticePage() {
  const [legal, site] = await Promise.all([getSettings("legal"), getSettings("site")]);
  return (
    <LegalPage title="Mentions légales" text={legal.legalNotice}>
      <div className="mt-12 rounded-2xl border border-white/[0.08] p-6 text-sm text-mist">
        <p className="font-semibold text-ivory-dim">{legal.companyName || site.casinoName}</p>
        {[site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" "), site.country].filter(Boolean).map((l) => (
          <p key={l}>{l}</p>
        ))}
        {site.phone && <p>{site.phone}</p>}
        {site.email && <p>{site.email}</p>}
      </div>
    </LegalPage>
  );
}
