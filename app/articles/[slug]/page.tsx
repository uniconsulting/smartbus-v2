import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LeadRequestLink from "@/components/LeadRequestLink";
import ArticleLikeButton from "@/components/ArticleLikeButton";
import { getPublishedArticles } from "@/lib/cms-articles";
import { getArticleCover } from "@/lib/article-covers";
import styles from "./article.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const articles = await getPublishedArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) return { title: "Статья не найдена | SmartBus" };
  const title = `${article.seoTitle} | SmartBus`;
  const url = `https://s-bus.ru/articles/${article.slug}`;
  const cover = getArticleCover(article);
  return {
    title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: article.description,
      type: "article",
      locale: "ru_RU",
      siteName: "SmartBus",
      url,
      images: [{ url: `https://s-bus.ru${cover.fullSrc}`, width: cover.width, height: cover.height, alt: cover.alt }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articles = await getPublishedArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  const cover = getArticleCover(article);
  const relatedArticles = articles.filter((item) => article.relatedSlugs.includes(item.slug));

  return (
    <div className="sb-home sb-inner-page sb-articles-page" id="top">
      <SiteHeader />
      <main className="sb-inner-main">
        <header className={`sb-section sb-frame ${styles.hero}`}>
          <Image src={cover.fullSrc} unoptimized={Boolean(article.customCover)} alt={cover.alt} fill sizes="100vw" quality={92} priority />
          <Link className={styles.back} href="/articles">Все статьи</Link>
          <h1>{article.title.replace(/\u00a0/g, " ")}</h1>
          <div className={styles.headingBottom}>
            <p className={styles.deck}>{article.focus}</p>
            <ArticleLikeButton slug={article.slug} />
          </div>
        </header>

          <div className={`sb-section ${styles.body}`}>
            <aside className={styles.toc}>
              <strong>В этой статье</strong>
              <nav aria-label="Содержание статьи">
                {article.sections.map((section, index) => (
                  <a href={`#section-${index + 1}`} key={section.heading}>{section.heading}</a>
                ))}
              </nav>
            </aside>

            <article className={styles.reading}>
              <div className={styles.intro}>
                {article.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {article.sections.map((section, index) => (
                <section id={`section-${index + 1}`} key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul>
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                  {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
              {article.conclusion && (
                <div className={styles.conclusion}>
                  {article.conclusion.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              )}
            </article>
          </div>

          <section className={`sb-section ${styles.related}`} aria-labelledby="related-articles-title">
            <h2 id="related-articles-title">По теме</h2>
            <div>{relatedArticles.map((item) => <Link href={`/articles/${item.slug}`} key={item.slug}>{item.title}</Link>)}</div>
          </section>

          <div className="sb-section"><div className={styles.actions}>
            <Link href="/articles">Вернуться ко всем статьям</Link>
            <LeadRequestLink task={`Консультация по статье «${article.title}»`}>Обсудить свою задачу</LeadRequestLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
