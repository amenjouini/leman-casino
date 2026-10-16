import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/request";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/tournois/*/reserver"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
