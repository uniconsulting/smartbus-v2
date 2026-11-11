import "server-only";
import { EditorialError } from "./cms-editions";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pdfResponse } from "./pdf-response";
import { dataDirectory, readRecord } from "./admin-store";
import { cooperationDocuments, visitorDocuments, type CatalogDocument, type LegalContent } from "./documents";
import { legalDocuments, type LegalSlug } from "./legal";
import { changeEdition, lines, object, slug, text, type Edition, type EditionMode } from "./cms-editions";

export type ManagedDocument = {
  slug: string;
  title: string;
  folderTitle: string;
  description: string;
  meta: string;
  tone: CatalogDocument["tone"];
  kind: CatalogDocument["kind"];
  group: "cooperation" | "visitors";
  pdf: string | null;
  legal: LegalContent | null;
};

const seedFiles: Record<string,string> = {
  company: "company-card-smartbus.pdf",
  license: "license-smartbus.pdf",
};
const originals = [...cooperationDocuments, ...visitorDocuments];
const defaults: Edition<ManagedDocument>[] = originals.map(doc => {
  const original = doc.kind === "legal" ? legalDocuments[doc.id as LegalSlug] : null;
  const value: ManagedDocument = {
    slug: doc.id, title: doc.title, folderTitle: doc.folderTitle, description: doc.description,
    meta: doc.meta, tone: ["proposal","privacy"].includes(doc.id) ? "gray" : doc.tone, kind: doc.kind,
    group: cooperationDocuments.includes(doc) ? "cooperation" : "visitors",
    pdf: seedFiles[doc.id] ?? null,
    legal: original ? { subtitle: original.subtitle, updated: original.updated, sections: original.sections.map(s => ({heading:s.heading, paragraphs:[...s.paragraphs]})) } : null,
  };
  return { id: doc.id, published: value, draft: value };
});

export const readDocumentEditions = () => readRecord("documents", defaults);
const filename = (key: string) => Object.hasOwn(seedFiles,key) ? seedFiles[key] : `${key}.pdf`;

function publicDocument(doc: ManagedDocument): CatalogDocument {
  return {
    id: doc.slug, title: doc.title, folderTitle: doc.folderTitle, description: doc.description,
    meta: doc.meta, tone: doc.tone, kind: doc.kind, group: doc.group,
    href: doc.kind === "pdf" ? `/docs/${filename(doc.slug)}` : doc.kind === "legal" ? `/documents/${doc.slug}` : `/documents?document=${doc.slug}`,
    legal: doc.kind === "legal" ? doc.legal : null,
  };
}

export async function getPublishedDocuments() {
  return (await readDocumentEditions()).value.flatMap(entry => entry.published ? [publicDocument(entry.published)] : []);
}

export async function getPublishedDocument(address: string) {
  return (await getPublishedDocuments()).find(doc => doc.id === address);
}

const pdfLimit = 10 * 1024 * 1024;

async function savePdf(file: File) {
  if (!file.size || file.size > pdfLimit) throw new EditorialError("Размер PDF должен быть не больше 10 МиБ.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!/^%PDF-\d\.\d/.test(bytes.subarray(0,8).toString("ascii")) || !bytes.subarray(-2048).includes("%%EOF")) throw new EditorialError("Выберите корректный PDF-файл.");
  const trailer = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(bytes.subarray(-2048).toString("latin1"));
  const offset = trailer ? Number(trailer[1]) : -1;
  if (!Number.isSafeInteger(offset) || offset <= 0 || offset >= bytes.length || !/^(xref|\d+\s+\d+\s+obj)/.test(bytes.subarray(offset,offset+60).toString("ascii"))) throw new EditorialError("В PDF повреждена таблица ссылок. Сохраните файл повторно и загрузите его.");
  const dir = join(dataDirectory(),"pdfs");
  await mkdir(dir,{recursive:true, mode:0o700});
  const key = `${randomUUID()}.pdf`;
  await writeFile(join(dir,key),bytes,{flag:"wx",mode:0o600});
  return key;
}

export async function changeDocument(id: string | null, expected: number, mode: EditionMode, input: unknown, upload?: File) {
  let created: string | null = null;
  try {
    return await changeEdition("documents", defaults, id, expected, mode, async (current, all) => {
      const raw = object(input);
      const publish = mode === "publish";
      const address = slug(raw.slug);
      if (Object.values(seedFiles).includes(`${address}.pdf`)) throw new EditorialError("Этот адрес зарезервирован исходным PDF. Используйте другой адрес.");
      if (current && current.draft.slug !== address) throw new EditorialError("Адрес сохранённого документа нельзя изменить.");
      if (all.some(e => e.id !== current?.id && (e.draft.slug === address || e.published?.slug === address))) throw new EditorialError("Этот адрес уже занят.");
      if (!["pdf","request","legal","pending"].includes(String(raw.kind)) || !["cooperation","visitors"].includes(String(raw.group)) || !["plum","violet","lavender","gray"].includes(String(raw.tone))) throw new EditorialError("Проверьте тип, группу и цвет документа.");
      const kind = raw.kind as ManagedDocument["kind"];
      const title = text(raw.title,"Название",250,true);
      const meta = text(raw.meta,"Подпись",180);
      let legal: LegalContent | null = null;
      if (kind === "legal") {
        const body = object(raw.legal);
        if (!Array.isArray(body.sections) || body.sections.length > 80 || (publish && !body.sections.length)) throw new EditorialError("Для публикации добавьте разделы документа (до 80).");
        legal = {
          subtitle:text(body.subtitle,"Введение",1500),
          updated:text(body.updated,"Редакция",180,publish),
          sections:body.sections.map((s, index) => {
            const section = object(s);
            const paragraphs = lines(section.paragraphs,"Абзацы");
            if (publish && !paragraphs.length) throw new EditorialError(`Добавьте текст раздела ${index+1}.`);
            return {heading:text(section.heading,"Название раздела",300,publish), paragraphs};
          }),
        };
      }
      const doc: ManagedDocument = {
        slug:address, title, folderTitle:text(raw.folderTitle,"Название папки",200) || title,
        description:text(raw.description,"Описание папки",1200),
        kind, tone:raw.tone as ManagedDocument["tone"], group:raw.group as ManagedDocument["group"],
        meta:kind === "legal" ? meta || legal!.updated : meta, legal, pdf:kind === "pdf" ? current?.draft.pdf ?? null : null,
      };
      if (kind === "pdf" && upload?.size) { created = await savePdf(upload); doc.pdf = created; }
      if (kind === "pdf" && publish && !doc.pdf) throw new EditorialError("Перед публикацией прикрепите PDF.");
      return doc;
    }, async (previous, editions) => {
      const old = new Set([previous.draft.pdf, previous.published?.pdf]);
      for (const name of old) {
        if (name && /^[a-f0-9-]{36}\.pdf$/.test(name) && !editions.some(e=>e.draft.pdf===name || e.published?.pdf===name)) {
          await unlink(join(dataDirectory(),"pdfs",name)).catch(()=>{});
        }
      }
    });
  } catch (error) {
    if (created) await unlink(join(dataDirectory(),"pdfs",created)).catch(() => {});
    throw error;
  }
}

export async function serveDocumentFile(key: string, request: Request, preview = false): Promise<Response> {
  const entries = (await readDocumentEditions()).value;
  const doc = preview ? entries.find(e => e.id === key)?.draft : entries.find(e => e.published && filename(e.published.slug) === key)?.published;
  if (!doc || doc.kind !== "pdf" || !doc.pdf) return new Response(null,{status:404,headers:{"Cache-Control":"no-store"}});
  const legacy = Object.values(seedFiles).includes(doc.pdf);
  if (!legacy && !/^[a-f0-9-]{36}\.pdf$/.test(doc.pdf)) return new Response(null,{status:404});
  const file = legacy ? join(process.cwd(),"assets","documents",doc.pdf) : join(dataDirectory(),"pdfs",doc.pdf);
  return pdfResponse(file, filename(doc.slug), request);
}
