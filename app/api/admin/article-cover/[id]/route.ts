import { requireAdmin } from "@/lib/admin-auth";
import { serveArticleCover } from "@/lib/cms-articles";
export const dynamic = "force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  await requireAdmin();
  return serveArticleCover((await params).id,true);
}
