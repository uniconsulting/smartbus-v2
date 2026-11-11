import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/cms-articles";
import { seoPages, readSeo, siteOrigin, type SeoPage } from "@/lib/cms-seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all((Object.keys(seoPages) as SeoPage[]).map(async key => {
    const { value } = await readSeo(key);
    return value.index ? [{ url: new URL(seoPages[key].path, siteOrigin).href }] : [];
  }));
  const articles = await getPublishedArticles();
  return [...pages.flat(), ...articles.map(a => ({ url: new URL("/articles/"+encodeURIComponent(a.slug), siteOrigin).href }))];
}
