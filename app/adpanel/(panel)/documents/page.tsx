import EditorialList, { type CatalogItem } from "@/components/admin/EditorialList";
import { requireAdmin } from "@/lib/admin-auth";
import { readDocumentEditions } from "@/lib/cms-documents";
import { reorderDocument } from "./actions";

const formats = { pdf: "PDF", legal: "Текст", request: "По запросу", pending: "В подготовке" };

export default async function DocumentsAdmin() {
  await requireAdmin();
  const { value, revision } = await readDocumentEditions();
  const items: CatalogItem[] = value.map(({ id, draft, published }) => ({
    id,
    title: draft.title,
    slug: draft.slug,
    subtitle: `${formats[draft.kind]} · ${draft.group === "cooperation" ? "Для сотрудничества" : "Для посетителей"}`,
    status: !published ? "draft" : JSON.stringify(draft) === JSON.stringify(published) ? "published" : "changed",
    url: published ? `/documents/${published.slug}` : null,
    documentType: draft.kind,
  }));
  return <EditorialList kind="documents" items={items} revision={revision} reorder={reorderDocument} />;
}
