import { copyFile, cp, mkdir } from "node:fs/promises";
// Keep the worker and decoder versions identical to the installed PDF.js package.
await mkdir("public/pdfjs", { recursive: true });
await copyFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/pdfjs/pdf.worker.min.mjs");
await cp("node_modules/pdfjs-dist/standard_fonts", "public/pdfjs/standard_fonts", { recursive: true });
await cp("node_modules/pdfjs-dist/wasm", "public/pdfjs/wasm", { recursive: true });
