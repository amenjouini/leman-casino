import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getAllPublicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { site, booking } = await getAllPublicSettings();
  const announcement = site.announcementEnabled && site.announcementText;

  return (
    <div className="flex min-h-screen flex-col">
      {announcement && (
        <div className="relative z-50 bg-gold-400 text-night-950">
          <div className="container-x flex min-h-10 items-center justify-center gap-2 py-2 text-center text-[0.8rem] font-semibold">
            {site.announcementLink ? (
              <Link href={site.announcementLink} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                {site.announcementText}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <p>{site.announcementText}</p>
            )}
          </div>
        </div>
      )}
      <Header casinoName={site.casinoName} logoUrl={site.logoUrl || undefined} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer site={site} booking={booking} />
    </div>
  );
}
