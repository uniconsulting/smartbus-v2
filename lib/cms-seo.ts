import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { readRecord } from "./admin-store";

export const seoPages = {
  home: { label: "Главная", path: "/", title: "SmartBus — корпоративные перевозки в Москве и Московской области", description: "Перевозка сотрудников, корпоративные трансферы и аренда автобусов в Москве и Московской области. Более 200 регулярных маршрутов. Рассчитайте поездку и оставьте заявку.", index: true },
  articles: { label: "Статьи", path: "/articles", title: "Статьи о корпоративных перевозках | SmartBus", description: "Перевозка сотрудников в Москве и Московской области: запуск маршрута, выбор автобуса с водителем, стоимость обслуживания и подготовка заявки. Материалы SmartBus.", index: true },
  documents: { label: "Документы", path: "/documents", title: "Документы SmartBus", description: "Реквизиты SmartBus и документы об обработке персональных данных.", index: false },
  contacts: { label: "Контакты", path: "/contacts", title: "Контакты SmartBus — телефоны, почта и офис в Москве", description: "Свяжитесь со SmartBus: офис, круглосуточная диспетчерская, электронная почта и адрес офиса на Яндекс Картах.", index: true },
};
export type SeoPage = keyof typeof seoPages;
export type SeoFields = { title: string; description: string; index: boolean };
export const siteOrigin = "https://s-bus.ru";
export const readSeo = cache(async (key: SeoPage) => {
  const { title, description, index } = seoPages[key];
  return readRecord<SeoFields>("seo-" + key, { title, description, index });
});
export async function publicMetadata(key: SeoPage): Promise<Metadata> {
  const { value } = await readSeo(key);
  const canonical = new URL(seoPages[key].path, siteOrigin).href;
  return {
    title: value.title, description: value.description,
    robots: { index: value.index, follow: value.index }, alternates: { canonical },
    openGraph: { title: value.title, description: value.description, url: canonical, type: "website", locale: "ru_RU", siteName: "SmartBus" },
  };
}
