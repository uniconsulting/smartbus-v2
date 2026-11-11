import Link from "next/link";
import { AdminModeStrip } from "@/components/admin/AdminModeStrip";
import { requireAdmin } from "@/lib/admin-auth";
import { seoPages, siteOrigin, readSeo, type SeoPage } from "@/lib/cms-seo";
import SeoForm from "./SeoForm";

export default async function SeoPageView({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const { page } = await searchParams;
  const current = page && Object.hasOwn(seoPages, page) ? page as SeoPage : "home";
  const record = await readSeo(current);
  const pages = Object.entries(seoPages);

  return <section className="admin-section">
    <header className="admin-heading">
      <h1>SEO</h1>
      <p className="admin-muted">Выберите страницу. Для отдельных статей заголовок и описание задаются в редакторе материала.</p>
    </header>
    <AdminModeStrip as="nav" className="admin-seo-modes" aria-label="Страницы для настройки SEO"
      activeIndex={pages.findIndex(([id]) => id === current)} count={pages.length}>
      {pages.map(([id, settings]) =>
        <Link key={id} aria-current={id === current ? "page" : undefined} href={"/adpanel/seo?page=" + id} scroll={false}>
          {settings.label}
        </Link>
      )}
    </AdminModeStrip>
    <SeoForm key={current} page={current} url={new URL(seoPages[current].path, siteOrigin).href}
      value={record.value} revision={record.revision} />
  </section>;
}
