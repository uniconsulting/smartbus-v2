import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LeadRequestLink from "@/components/LeadRequestLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPublishedDocument } from "@/lib/cms-documents";
import { getPublicContacts } from "@/lib/cms-contacts";
import styles from "./legal-document.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedDocument(slug);
  return { title: `${doc?.title ?? "Документ"} | SmartBus`, robots: { index: false, follow: false } };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedDocument(slug);
  if (!item) notFound();
  if (item.kind === "pdf") redirect(item.href);
  if (item.kind !== "legal") return <div className="sb-home sb-inner-page" id="top">
    <SiteHeader /><main className={`sb-inner-main ${styles.main}`}><article className="sb-section">
      <header className={styles.heading}>
        <Link className={styles.back} href="/documents">Все документы</Link>
        <h1>{item.title}</h1><p>{item.description}</p>
        <LeadRequestLink className={styles.back} task={`Запрос документа: ${item.title}`}>Запросить документ</LeadRequestLink>
      </header>
    </article></main><SiteFooter />
  </div>;
  if (!item.legal) notFound();
  const doc = { ...item.legal, title: item.title };
  const contacts = await getPublicContacts();

  return (
    <div className="sb-home sb-inner-page" id="top">
      <SiteHeader />
      <main className={`sb-inner-main ${styles.main}`}>
        <div className="sb-section">
          <header className={styles.heading}>
            <Link className={styles.back} href="/documents">Все документы</Link>
            <span className={styles.updated}>{doc.updated}</span>
            <h1>{doc.title}</h1>
            <p>{doc.subtitle}</p>
          </header>
          <div className={styles.layout}>
            <aside className={styles.toc}>
              <strong>Содержание</strong>
              <nav aria-label="Содержание документа">
                {doc.sections.map((section, index) => <a key={section.heading} href={`#document-section-${index + 1}`}>{section.heading}</a>)}
              </nav>
              <small>{doc.updated}</small>
            </aside>
            <article className={styles.body}>
              {doc.sections.map((section, index) => (
                <section id={`document-section-${index + 1}`} key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </article>
          </div>
          <div className={styles.end}>
            <p>Есть вопрос по документу? Напишите нам.</p>
            <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
