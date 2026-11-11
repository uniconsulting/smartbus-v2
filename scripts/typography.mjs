import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

// Protect Russian conjunctions, short prepositions and a following word as one
// line-breaking unit. An em dash belongs to the following phrase on this site.
const attachedWords = [
  "а", "и", "но", "да", "или", "либо", "что", "чтобы", "как", "если",
  "когда", "пока", "хотя", "чем", "ведь", "зато", "однако", "также",
  "поскольку", "потому", "поэтому", "будто", "словно", "ибо", "то",
  "в", "во", "к", "ко", "о", "об", "обо", "с", "со", "у", "на", "по",
  "из", "от", "до", "за", "для", "без", "при", "над", "под", "про",
  "через", "между", "перед", "не", "ни", "бы", "же", "ли",
];
const wordSpace = new RegExp(`(?<![\\p{L}\\p{N}_])(${attachedWords.join("|")})([,)»”]*)[ \\t\\r\\n]+(?=\\S)`, "giu");

function normalize(text) {
  return text
    .replace(/\u00a0(?=—)/g, " ")
    .replace(/—[ \t\r\n]+(?=\S)/g, "—\u00a0")
    .replace(wordSpace, "$1$2\u00a0");
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : file.endsWith(".tsx") ? [file] : [];
  }));
  return files.flat();
}

const files = [
  ...await sourceFiles("app"),
  ...await sourceFiles("components"),
  "app/api/lead/route.ts",
  "lib/articles.ts", "lib/legal.ts", "lib/site.ts",
];
const check = process.argv.includes("--check");
let changed = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      const quoted = !ts.isJsxText(node);
      const start = quoted ? node.getStart(tree) + 1 : node.pos;
      const end = node.end - (quoted ? 1 : 0);
      const text = source.slice(start, end);
      if (/[а-яё]/i.test(text)) {
        const next = normalize(text);
        if (next !== text) edits.push({ start, end, next });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!edits.length) continue;
  changed++;
  if (!check) {
    let output = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      output = output.slice(0, edit.start) + edit.next + output.slice(edit.end);
    }
    await writeFile(file, output);
  }
  console.log(`${check ? "Needs typography:" : "Formatted:"} ${file} (${edits.length} text fragments)`);
}
if (check && changed) process.exitCode = 1;
if (!changed) console.log("Typography is consistent.");
