import { getPublishedDocument } from "@/lib/cms-documents";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const item = await getPublishedDocument((await params).id);
  return Response.json(item ?? {error:"Документ не найден"},{status:item ? 200 : 404,headers:{"Cache-Control":"no-store"}});
}
