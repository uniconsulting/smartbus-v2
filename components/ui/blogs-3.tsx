import Image from "next/image";
import Link from "next/link";
import LeadRequestLink from "@/components/LeadRequestLink";
import { leadTasks } from "@/lib/lead-request";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import ArticleLikeButton from "@/components/ArticleLikeButton";
import type { Article } from "@/lib/articles";
import { getArticleCover } from "@/lib/article-covers";
import styles from "./blogs-3.module.css";

// An estimate from the actual article text, rather than invented publication metadata.
function readingMinutes(article: Article) {
  const text = [article.title, article.focus, ...article.intro, ...article.sections.flatMap(section => [
    section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? []), ...(section.after ?? []),
  ]), ...(article.conclusion ?? [])].join(" ");
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 180));
}

export default function BlogsSection({ articles }: { articles: Article[] }) {
  return <>
    <section className={`sb-section sb-frame ${styles.hero}`} aria-labelledby="journal-title">
      <div className={styles.heroVisual}>
        <Image src="/articles/generated/journal-hero.webp" alt="" fill sizes="100vw" priority />
      </div>
      <div className={styles.heroCopy}>
        <h1 id="journal-title">Хорошая поездка начинается с ясности</h1>
        <p>Коротко и по делу о маршрутах, транспорте и ежедневной организации корпоративных перевозок</p>
        <a className={styles.heroLink} href="#materials">Выбрать материал <HugeiconsIcon icon={ArrowDown02Icon} size={18} aria-hidden="true" /></a>
      </div>
    </section>

    <section className={`sb-section ${styles.section}`} id="materials" aria-labelledby="articles-title">
      <div className={styles.sectionHead}>
        <div><h2 id="articles-title">Разбираем по делу</h2></div>
        <p>Практические материалы для тех,<br /> кто отвечает за перевозку команды</p>
      </div>
      <div className={styles.divider}><span>Все материалы</span><span>{String(articles.length).padStart(2, "0")}</span></div>
      <div className={styles.grid}>
        {articles.map((article) => <BlogCard article={article} key={article.slug} />)}
        <aside className={styles.consultation} aria-labelledby="journal-contact-title">
          <div className={styles.consultationPattern} aria-hidden="true" />
          <Image className={styles.consultationMark} src="/brand/mark.webp" alt="" width={104} height={79} />
          <div className={styles.consultationCopy}>
            <h3 id="journal-contact-title">У вашей задачи<br />свой маршрут</h3>
            <p>Расскажите, кого, откуда и когда нужно возить — подберём решение под ваш график</p>
            <LeadRequestLink task={leadTasks.general}>Обсудить перевозку <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} aria-hidden="true" /></LeadRequestLink>
          </div>
        </aside>
      </div>
    </section>
  </>;
}

function BlogCard({ article }: { article: Article }) {
  const cover = getArticleCover(article);
  return <article className={`article-card ${styles.card}`}>
    <Link className={styles.cardLink} href={`/articles/${article.slug}`} aria-label={`Читать статью: ${article.title}`}>
      <div className={styles.cover}>
        <Image src={cover.src} unoptimized={Boolean(article.customCover)} alt={cover.alt} fill sizes="(max-width: 700px) 94vw, 47vw" />
      </div>
      <div className={styles.cardCopy}>
        <div className={styles.meta}><span><HugeiconsIcon icon={Clock01Icon} size={14} aria-hidden="true" />≈ {readingMinutes(article)} мин</span></div>
        <h3>{article.title}</h3>
        <p>{article.focus}</p>
        <div className={styles.readLink}>Читать материал<span><HugeiconsIcon icon={ArrowUpRight01Icon} size={19} aria-hidden="true" /></span></div>
      </div>
    </Link>
    <ArticleLikeButton slug={article.slug} compact />
  </article>;
}
