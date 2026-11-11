import { serveDocumentFile } from "@/lib/cms-documents";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  return serveDocumentFile((await params).file,request);
}
export const HEAD = GET;
