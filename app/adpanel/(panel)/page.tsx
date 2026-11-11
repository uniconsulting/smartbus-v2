import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { readArticleEditions } from "@/lib/cms-articles";
import { readDocumentEditions } from "@/lib/cms-documents";
import { getPublicContacts } from "@/lib/cms-contacts";
import { integrationSettings } from "@/lib/integrations";
import { analyticsDb } from "@/lib/analytics-store";

import { HugeiconsIcon as Icon } from "@hugeicons/react";
import Arrow from "@hugeicons/core-free-icons/ArrowRight02Icon";
import Plus from "@hugeicons/core-free-icons/Add01Icon";
import News from "@hugeicons/core-free-icons/News01Icon";
import Folder from "@hugeicons/core-free-icons/Folder02Icon";
import Contact from "@hugeicons/core-free-icons/Contact01Icon";
import Chart from "@hugeicons/core-free-icons/AnalyticsUpIcon";
import Search from "@hugeicons/core-free-icons/Search01Icon";
import Plug from "@hugeicons/core-free-icons/Plug01Icon";

function publicationSummary(items: { published: unknown; draft: unknown }[]) {
  const published = items.filter(item => item.published !== null).length;
  const drafts = items.filter(item => JSON.stringify(item.draft) !== JSON.stringify(item.published)).length;
  return { published, drafts };
}

export default async function Dashboard() {
  await requireAdmin();
  const [articles, documents, contacts, config, db] = await Promise.all([
    readArticleEditions(), readDocumentEditions(), getPublicContacts(), integrationSettings(), analyticsDb(),
  ]);
  const start = new Date(Date.now() - 30 * 86400000).toISOString();
  const { rows } = await db.execute({ sql: "SELECT count(*) AS n FROM lead_requests WHERE at >= ?", args: [start] });
  const maxConfigured = config.maxSecret !== "missing" && Boolean(config.maxChat || config.maxUser);
  const telegramConfigured = config.telegramSecret !== "missing" && Boolean(config.telegramChat);
  const usesMax = config.mode === "max" || (config.mode === "auto" && config.maxSecret !== "missing");
  const botLabel = config.mode === "local" ? "Только сохранение на сайте" :
    usesMax && maxConfigured ? "Уведомления через MAX" :
    !usesMax && telegramConfigured ? "Уведомления через Telegram" : "Подключить уведомления";
  const materials = [
    { path: "articles", title: "Статьи", add: "Написать статью", icon:News, ...publicationSummary(articles.value) },
    { path: "documents", title: "Документы", add: "Добавить документ", icon:Folder, ...publicationSummary(documents.value) },
  ];
  const sections = [
    { path:"contacts", title:"Контакты", detail:contacts.phone+" · "+contacts.email, icon:Contact },
    { path:"analytics", title:"Аналитика", detail:"Заявок за последние 30 дней: "+Number(rows[0].n), icon:Chart },
    { path:"seo", title:"SEO", detail:"Заголовки и описания в поиске", icon:Search },
    { path:"integrations", title:"Интеграции", detail:botLabel, icon:Plug },
  ];
  return <section className="admin-section admin-dash">
    <header className="admin-heading"><h1>Обзор</h1><p>Публикации, обращения и настройки сайта.</p></header>
    <div className="admin-dash-collections">{materials.map(item=><article key={item.path} className="admin-card admin-dash-collection">
      <header><span className="admin-dash-icon"><Icon icon={item.icon} size={22} aria-hidden="true"/></span><h2><Link href={"/adpanel/"+item.path}>{item.title}</Link></h2></header>
      <dl><div><dt>На сайте</dt><dd>{item.published}</dd></div><div><dt>Черновики и правки</dt><dd>{item.drafts}</dd></div></dl>
      <footer><Link href={"/adpanel/"+item.path+"/new"}><Icon icon={Plus} size={16} aria-hidden="true"/>{item.add}</Link>
        <Link href={"/adpanel/"+item.path} aria-label={"Открыть список: "+item.title}>К списку <Icon icon={Arrow} size={16} aria-hidden="true"/></Link></footer>
    </article>)}</div>
    <h2 className="admin-dash-sub">Управление сайтом</h2>
    <div className="admin-dash-links">{sections.map(item=><Link key={item.path} href={"/adpanel/"+item.path} prefetch={false}>
      <span className="admin-dash-icon"><Icon icon={item.icon} size={21} aria-hidden="true"/></span>
      <div><h3>{item.title}</h3><p>{item.detail}</p></div><Icon icon={Arrow} size={18} aria-hidden="true"/>
    </Link>)}</div>
  </section>;
}
