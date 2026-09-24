import type { MetadataRoute } from "next";
import { getIssuer } from "@/lib/oauth/constants";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? getIssuer();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
