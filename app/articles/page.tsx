import { publicMetadata } from "@/lib/cms-seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ArticleMotion from "@/components/ArticleMotion";
import BlogsSection from "@/components/ui/blogs-3";
import { getPublishedArticles } from "@/lib/cms-articles";

export const dynamic = "force-dynamic";

export const generateMetadata = () => publicMetadata("articles");

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();
  return (
    <div className="sb-home sb-inner-page sb-articles-page" id="top">
      <SiteHeader />
      <main className="sb-inner-main">
        <ArticleMotion />
        <BlogsSection articles={articles} />
      </main>
      <SiteFooter />
    </div>
  );
}
