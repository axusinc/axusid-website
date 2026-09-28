import type { MetadataRoute } from "next";
import { getIssuer } from "@/lib/oauth/constants";

const paths = [
  "/",
  "/brand",
  "/developers",
  "/developers/quickstart",
  "/developers/reference",
  "/developers/api",
  "/developers/permissions",
  "/developers/become-an-app",
  "/developers/playground",
  "/developers/troubleshooting",
  "/security",
  "/security/recovery",
  "/status",
  "/legal/privacy",
  "/legal/terms",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? getIssuer();
  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));
}
