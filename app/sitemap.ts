import type { MetadataRoute } from "next";
import { listPublicTournaments } from "@/lib/tournaments";
import { siteUrl } from "@/lib/request";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/poker", "/tournois", "/reserver", "/resultats", "/le-casino", "/contact", "/jeu-responsable", "/confidentialite", "/mentions-legales"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  let tournaments: MetadataRoute.Sitemap = [];
  try {
    tournaments = (await listPublicTournaments({ limit: 200 })).map((tm) => ({
      url: `${base}/tournois/${tm.slug}`,
      lastModified: tm.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    /* database unavailable: static pages only */
  }
  return [...pages, ...tournaments];
}
