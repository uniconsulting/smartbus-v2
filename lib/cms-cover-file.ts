import "server-only";
import { EditorialError } from "./cms-editions";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { dataDirectory } from "./admin-store";

export const coverPath = (file: string) => join(dataDirectory(),"article-covers",file);
export async function removeCover(file: string){await unlink(coverPath(file)).catch(()=>{});}

export async function saveCover(file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) throw new EditorialError("Выберите JPEG, PNG или WebP объёмом до 8 МиБ.");
  const source = Buffer.from(await file.arrayBuffer());
  const decoder = sharp(source,{limitInputPixels:25_000_000,failOn:"error"});
  const meta = await decoder.metadata().catch(()=>null);
  if (!meta || !["jpeg","png","webp"].includes(meta.format) || !meta.width || !meta.height || meta.width*meta.height>25_000_000 || (meta.pages??1)>1) {
    throw new EditorialError("Нужна фотография JPEG, PNG или WebP до 25 мегапикселей без анимации.");
  }
  const result = await decoder.rotate().resize({width:1920,height:1600,fit:"inside",withoutEnlargement:true}).webp({quality:86}).toBuffer({resolveWithObject:true}).catch(()=>null);
  if (!result) throw new EditorialError("Не удалось прочитать изображение. Загрузите другой файл.");
  const name = `${randomUUID()}.webp`;
  await mkdir(join(dataDirectory(),"article-covers"),{recursive:true,mode:0o700});
  await writeFile(coverPath(name),result.data,{flag:"wx",mode:0o600});
  return {file:name,width:result.info.width,height:result.info.height};
}
