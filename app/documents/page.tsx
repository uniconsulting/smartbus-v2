import { publicMetadata } from "@/lib/cms-seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DocumentsLibrary from "@/components/DocumentsLibrary";
import { getPublishedDocuments } from "@/lib/cms-documents";

export const dynamic = "force-dynamic";

export const generateMetadata = () => publicMetadata("documents");

export default async function DocumentsPage() {
  const docs=(await getPublishedDocuments()).map(({legal,...doc})=>doc);
  return (
    <div className="sb-home sb-inner-page" id="top">
      <SiteHeader />
      <main className="sb-inner-main">
        <h1 className="visually-hidden">Документы SmartBus</h1>
        <DocumentsLibrary documents={docs} />
      </main>
      <SiteFooter />
    </div>
  );
}
