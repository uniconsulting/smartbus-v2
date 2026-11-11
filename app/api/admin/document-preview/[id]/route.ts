import { requireAdmin } from "@/lib/admin-auth";
import { serveDocumentFile } from "@/lib/cms-documents";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  return serveDocumentFile((await params).id,request,true);
}
export const HEAD = GET;
