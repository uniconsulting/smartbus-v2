import { legalDocuments, type LegalSlug } from "./legal";

export type DocumentId = string;
export type LegalContent = { subtitle: string; updated: string; sections: { heading: string; paragraphs: string[] }[] };
export type CatalogDocument = {
  id: DocumentId;
  group?: "cooperation" | "visitors";
  legal?: LegalContent | null;
  title: string;
  folderTitle: string;
  description: string;
  meta: string;
  tone: "plum" | "violet" | "lavender" | "gray";
  kind: "pdf" | "request" | "legal" | "pending";
  href: string;
};

export const cooperationDocuments: CatalogDocument[] = [
  { id: "company", title: "Карточка предприятия", folderTitle: "Карточка\nпредприятия", description: "Здесь указаны реквизиты компании\nдля оформления договора.", meta: "PDF · 1 страница", tone: "plum", kind: "pdf", href: "/docs/company-card-smartbus.pdf" },
  { id: "licenses", title: "Лицензия и допуски", folderTitle: "Лицензия\nи допуски", description: "Перечень документов и предоставление\nкопий согласуем при обращении.", meta: "По запросу", tone: "violet", kind: "request", href: "/documents?document=licenses" },
  { id: "proposal", title: "Договор и предложение", folderTitle: "Договор\nи предложение", description: "Запросите условия работы и расчёт\nстоимости вашей поездки.", meta: "По запросу", tone: "lavender", kind: "request", href: "/documents?document=proposal" },
  { id: "license", title: "Лицензия", folderTitle: "Лицензия\nна перевозку", description: "Лицензия на перевозку\nпассажиров.", meta: "PDF · 2 страницы", tone: "violet", kind: "pdf", href: "/docs/license-smartbus.pdf" },
];

const visitorFolders: { id: LegalSlug; folderTitle: string; description: string }[] = [
  { id: "privacy", folderTitle: "Обработка\nданных", description: "Политика обработки\nперсональных данных" },
  { id: "consent", folderTitle: "Согласие на\nобработку данных", description: "Для отправки заявки\nна перевозку" },
  { id: "cookies", folderTitle: "Политика\ncookie", description: "Как сайт использует\ncookie" },
  { id: "terms", folderTitle: "Пользовательское\nсоглашение", description: "Условия использования\nсайта" },
];
export const visitorDocuments: CatalogDocument[] = visitorFolders.map(({ id, folderTitle, description }) => ({
  id, title: legalDocuments[id].title, folderTitle, description,
  meta: legalDocuments[id].updated, tone: id === "cookies" ? "plum" : "lavender", kind: "legal", href: `/documents/${id}`,
}));
export const documentCatalog = [...cooperationDocuments, ...visitorDocuments];
export function findDocument(id: string) { return documentCatalog.find((doc) => doc.id === id); }
export function documentIdFromHref(href: string): DocumentId | undefined {
  return documentCatalog.find((doc) => doc.href === href)?.id;
}
