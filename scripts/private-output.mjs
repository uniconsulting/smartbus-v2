import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../", import.meta.url));

function contains(directory, path) {
  const suffix = relative(directory, path);
  return suffix === "" || (!isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(".." + sep));
}

// Covers normal checkouts as well as a public/build directory mounted via symlink.
export async function privateOutputPath(requested) {
  const protectedPaths = [await realpath(project)];
  for (const name of ["public", ".next", ".next-build"]) {
    try {
      protectedPaths.push(await realpath(join(project, name)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const absolute = resolve(requested);
  let parent = dirname(absolute);
  const destination = join(await realpath(parent), basename(absolute));
  // Check each parent too: /project/link-out/file and /elsewhere/link-in/file
  // must both be rejected. The actual write uses the canonical destination.
  for (;;) {
    const canonical = await realpath(parent);
    if (protectedPaths.some(directory => contains(directory, canonical))) {
      throw new Error("Выберите файл в закрытом каталоге за пределами проекта и публикуемых файлов сайта.");
    }
    if (dirname(parent) === parent) break;
    parent = dirname(parent);
  }
  return destination;
}
