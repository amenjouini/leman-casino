import type { Metadata } from "next";
import { Clock, Facebook, Instagram, Linkedin, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { PageHero } from "@/components/site/Section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & accès",
  description: "Coordonnées, plan d'accès et horaires du Léman Poker & Casino à Lausanne.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const site = await getSettings("site");
  const address = [site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" "), site.country].filter(Boolean).join(", ");
  const socials = [
    { href: site.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: site.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: site.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((s) => s.href);

  const cards = [
    site.phone && { Icon: Phone, label: "Téléphone", value: site.phone, href: `tel:${site.phone.replace(/[^+0-9]/g, "")}` },
    site.email && { Icon: Mail, label: "E-mail", value: site.email, href: `mailto:${site.email}` },
    address && { Icon: MapPin, label: "Adresse", value: address, href: site.mapsLink || undefined },
  ].filter(Boolean) as { Icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHero eyebrow={t.home.locationEyebrow} title={t.nav.contact} lead="Une question sur un tournoi, une réservation ou un événement ? Notre équipe vous répond volontiers." />
      <section className="py-16 lg:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {cards.map(({ Icon, label, value, href }) => (
              <div key={label} className="surface flex items-start gap-5 p-6">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-500/30 text-gold-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fog">{label}</p>
                  {href ? (
                    <a href={href} className="mt-1 block break-words font-display text-2xl text-ivory hover:text-gold-300" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {value}
                    </a>
                  ) : (
                    <p className="mt-1 break-words font-display text-2xl text-ivory">{value}</p>
                  )}
                </div>
              </div>
            ))}
            {site.openingHours && (
              <div className="surface flex items-start gap-5 p-6">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-500/30 text-gold-300">
                  <Clock className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fog">{t.footer.hours}</p>
                  <p className="mt-1 whitespace-pre-line text-ivory-dim">{site.openingHours}</p>
                </div>
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {socials.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {site.mapEmbedUrl ? (
            <div className="flex flex-col gap-3">
              <div className="min-h-96 flex-1 overflow-hidden rounded-2xl border border-white/[0.08]">
                <iframe
                  src={site.mapEmbedUrl}
                  title={`Carte : ${site.casinoName}`}
                  className="h-full min-h-96 w-full grayscale-[0.4] invert-[0.92] hue-rotate-180"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              {site.mapsLink && (
                <a href={site.mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm self-start">
                  <Navigation className="h-4 w-4" aria-hidden />
                  {t.cta.itinerary}
                </a>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
