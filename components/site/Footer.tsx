import Link from "next/link";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { t } from "@/lib/i18n";
import type { BookingSettings, SiteSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { LakeLines } from "./LakeLines";

export function Footer({ site, booking }: { site: SiteSettings; booking: BookingSettings }) {
  const year = new Date().getFullYear();
  const address = [site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" "), site.country].filter(Boolean);
  const socials = [
    { href: site.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: site.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: site.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-night-950">
      <LakeLines className="pointer-events-none absolute -right-40 -top-24 h-[34rem] w-[60rem] text-gold-500/[0.05]" />
      <div className="container-x relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:py-20">
        <div className="max-w-sm">
          <Logo src={site.logoUrl} name={site.casinoName} />
          {site.tagline && <p className="mt-5 text-sm uppercase tracking-[0.18em] text-mist">{site.tagline}</p>}
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (nouvel onglet)`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ivory-dim transition-colors hover:border-gold-400 hover:text-gold-300"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="eyebrow mb-5 font-sans">{t.footer.explore}</h2>
          <ul className="space-y-3 text-sm">
            {[
              ["/poker", t.nav.poker],
              ["/tournois", t.nav.calendar],
              ["/reserver", t.nav.book],
              ["/reservation", "Ma réservation"],
              ["/resultats", t.nav.results],
              ["/#roulette", t.nav.roulette],
              ["/le-casino", t.nav.about],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ivory-dim transition-colors hover:text-gold-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-5 font-sans">{t.footer.info}</h2>
          <ul className="space-y-3 text-sm">
            {[
              ["/contact", t.nav.contact],
              ["/jeu-responsable", t.footer.responsible],
              ["/confidentialite", t.footer.privacy],
              ["/mentions-legales", t.footer.legal],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ivory-dim transition-colors hover:text-gold-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-5 font-sans">{t.footer.contact}</h2>
          <ul className="space-y-3.5 text-sm text-ivory-dim">
            {address.length > 0 && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
                <span>{address.join(", ")}</span>
              </li>
            )}
            {site.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
                <a href={`tel:${site.phone.replace(/[^+0-9]/g, "")}`} className="hover:text-gold-300">
                  {site.phone}
                </a>
              </li>
            )}
            {site.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
                <a href={`mailto:${site.email}`} className="break-all hover:text-gold-300">
                  {site.email}
                </a>
              </li>
            )}
          </ul>
          {site.openingHours && (
            <div className="mt-6">
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-mist">{t.footer.hours}</h3>
              <p className="whitespace-pre-line text-sm text-ivory-dim">{site.openingHours}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-fog md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.casinoName}. {t.footer.rights}
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-flex h-5 min-w-8 items-center justify-center rounded border border-white/15 px-1.5 font-semibold text-ivory-dim">
              {booking.minimumAge}+
            </span>
            <Link href="/jeu-responsable" className="hover:text-gold-300">
              {t.footer.responsible}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/admin" className="hover:text-gold-300" rel="nofollow">
              {t.footer.staff}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
