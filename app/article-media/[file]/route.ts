import { serveArticleCover } from "@/lib/cms-articles";
export const dynamic = "force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{file:string}>}) {
  return serveArticleCover((await params).file);
}
