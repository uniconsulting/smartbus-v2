import type { Article } from "./articles";

// Shared by the article cards and full articles so their photos stay in sync.
export const articleCovers: Record<Article["visual"], { src: string; fullSrc: string; alt: string }> = {
  bus: {
    src: "/articles/generated/corporate-shuttle.webp",
    fullSrc: "/articles/generated/corporate-shuttle.webp",
    alt: "Сотрудники садятся в корпоративный автобус у делового центра",
  },
  route: {
    src: "/articles/generated/route-planning.webp",
    fullSrc: "/articles/generated/route-planning.webp",
    alt: "Вид сверху на автобус на изгибающейся дороге делового кампуса",
  },
  fleet: {
    src: "/articles/generated/fleet-selection.webp",
    fullSrc: "/articles/generated/fleet-selection.webp",
    alt: "Большой автобус, средний автобус и микроавтобус на одной площадке",
  },
  control: {
    src: "/articles/generated/trip-control.webp",
    fullSrc: "/articles/generated/trip-control.webp",
    alt: "Рабочее место диспетчера с картой маршрута и рацией",
  },
  brief: {
    src: "/articles/generated/transport-brief.webp",
    fullSrc: "/articles/generated/transport-brief.webp",
    alt: "Документы и схема маршрута для подготовки заявки на перевозку",
  },
};

export function getArticleCover(article: Article) {
  const base = articleCovers[article.visual];
  if (!article.customCover) return { ...base, alt: article.coverAlt || base.alt, width:1536, height:1024 };
  const { file, width, height } = article.customCover;
  const src = `/article-media/${file}`;
  return { src, fullSrc:src, alt:article.coverAlt || article.title, width, height };
}
