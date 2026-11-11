import "server-only";
import { EditorialError } from "./cms-editions";
import { readFile } from "node:fs/promises";
import { coverPath, removeCover, saveCover } from "./cms-cover-file";
import { articles, type Article, type ArticleSection } from "./articles";
import { readRecord } from "./admin-store";
import { changeEdition, lines, object, slug, text, type Edition, type EditionMode } from "./cms-editions";
import { articleCovers } from "./article-covers";

const defaults: Edition<Article>[] = articles.map(item => ({ id: item.slug, draft: item, published: item }));
export const readArticleEditions = () => readRecord("articles", defaults);

export async function getPublishedArticles() {
  return (await readArticleEditions()).value.flatMap(entry => entry.published ? [entry.published] : []);
}

export async function changeArticle(id: string | null, expected: number, mode: EditionMode, input: unknown, file?: File) {
  let created: string | null = null;
  try {
    return await changeEdition("articles", defaults, id, expected, mode, async (current, all) => {
      const a = object(input);
      const publish = mode === "publish";
      const address = slug(a.slug);
      if (all.some(e => e.id !== current?.id && (e.draft.slug === address || e.published?.slug === address))) {
        throw new EditorialError("Этот адрес уже используется другой статьёй.");
      }
      if (typeof a.visual !== "string" || !Object.hasOwn(articleCovers,a.visual)) throw new EditorialError("Выберите обложку статьи.");
      if (!Array.isArray(a.sections) || a.sections.length > 80) throw new EditorialError("Допустимо до 80 разделов статьи.");
      const sections: ArticleSection[] = a.sections.map((raw, index) => {
        const part = object(raw);
        return {
          heading: text(part.heading, `Заголовок раздела ${index + 1}`, 250, publish),
          paragraphs: lines(part.paragraphs,"Абзацы"), bullets: lines(part.bullets,"Список"), after: lines(part.after,"Текст после списка"),
        };
      });
      const intro = lines(a.intro,"Вступление");
      const relatedSlugs = [...new Set(lines(a.relatedSlugs,"По теме").map(v => slug(v)))].filter(s => s !== address);
      if (publish && (!sections.length || sections.some(s => !s.paragraphs?.length && !s.bullets?.length && !s.after?.length))) throw new EditorialError("Для публикации добавьте разделы с текстом.");
      const title = text(a.title,"Заголовок",250,true);
      const focus = text(a.focus,"Краткое описание",1000,publish);
      const coverAlt = text(a.coverAlt, "Описание обложки", 400, publish && a.coverSource==="custom");
      let customCover: Article["customCover"];
      if (a.coverSource === "custom") {
        customCover = current?.draft.customCover ?? current?.published?.customCover;
        if (file?.size) { customCover = await saveCover(file); created = customCover.file; }
        if (!customCover) throw new EditorialError("Загрузите новую обложку или выберите фотографию из библиотеки.");
      }
      return {
        coverAlt, ...(customCover && {customCover}),
        slug: address, title, category: text(a.category,"Категория",120),
        seoTitle: text(a.seoTitle,"SEO-заголовок",250) || title,
        description: text(a.description,"SEO-описание",1000) || focus,
        visual: a.visual as Article["visual"], focus, intro, sections, conclusion: lines(a.conclusion,"Заключение"), relatedSlugs,
      };
    }, async (previous, editions) => {
      const old = new Set([previous.draft.customCover?.file, previous.published?.customCover?.file]);
      for (const name of old) {
        if (name && /^[a-f0-9-]{36}\.webp$/.test(name) && !editions.some(e=>e.draft.customCover?.file===name || e.published?.customCover?.file===name)) {
          await removeCover(name);
        }
      }
    });
  } catch (e) {
    if (created) await removeCover(created);
    throw e;
  }
}

export async function serveArticleCover(value: string, preview=false) {
  const editions = (await readArticleEditions()).value;
  const image = preview ? editions.find(e=>e.id===value)?.draft.customCover : editions.find(e=>e.published?.customCover?.file===value)?.published?.customCover;
  if (!image || !/^[a-f0-9-]{36}\.webp$/.test(image.file)) return new Response(null,{status:404,headers:{"Cache-Control":"no-store"}});
  const data = await readFile(coverPath(image.file)).catch((err: NodeJS.ErrnoException)=>{if(err.code==="ENOENT")return null;throw err;});
  if (!data) return new Response(null,{status:404,headers:{"Cache-Control":"no-store"}});
  return new Response(new Uint8Array(data),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Length":String(data.length)}});
}
