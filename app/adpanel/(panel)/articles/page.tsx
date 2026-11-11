import EditorialList, { type CatalogItem } from "@/components/admin/EditorialList";
import { requireAdmin } from "@/lib/admin-auth";
import { articleCovers } from "@/lib/article-covers";
import { readArticleEditions } from "@/lib/cms-articles";
import { reorderArticle } from "./actions";

export default async function ArticlesAdmin() {
  await requireAdmin();
  const { value, revision } = await readArticleEditions();
  const items: CatalogItem[] = value.map(({ id, draft, published }) => ({
    id,
    title: draft.title,
    subtitle: draft.category,
    slug: draft.slug,
    status: !published ? "draft" : JSON.stringify(draft) === JSON.stringify(published) ? "published" : "changed",
    url: published ? `/articles/${published.slug}` : null,
    cover: draft.customCover ? `/api/admin/article-cover/${id}?v=${draft.customCover.file}` : articleCovers[draft.visual].src,
  }));
  return <EditorialList kind="articles" items={items} revision={revision} reorder={reorderArticle} />;
}
