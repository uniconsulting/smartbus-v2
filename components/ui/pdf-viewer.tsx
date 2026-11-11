"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";
import styles from "./document-viewer.module.css";

function PDFPage({ pdf, number, width, rotation }: { pdf: PDFDocumentProxy; number: number; width: number; rotation: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    let render: RenderTask | undefined;
    let text: TextLayer | undefined;
    setError(false);
    async function draw() {
      try {
        const [page, pdfjs] = await Promise.all([pdf.getPage(number), import("pdfjs-dist")]);
        if (!live) return;
        const base = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
        const viewport = page.getViewport({ scale: width / base.width, rotation: (page.rotate + rotation) % 360 });
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width * density);
        canvas.height = Math.ceil(viewport.height * density);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute("aria-hidden", "true");
        render = page.render({ canvas, viewport, transform: [density, 0, 0, density, 0, 0] });
        await render.promise;
        if (!live) return;
        const layer = document.createElement("div");
        layer.className = styles.textLayer;
        layer.style.setProperty("--total-scale-factor", String(viewport.scale));
        text = new pdfjs.TextLayer({ container: layer, viewport, textContentSource: await page.getTextContent() });
        await text.render();
        if (!live || !host.current) return;
        host.current.replaceChildren(canvas, layer);
        host.current.style.width = `${viewport.width}px`;
        host.current.style.height = `${viewport.height}px`;
        host.current.style.minHeight = "0";
        host.current.dataset.ready = "true";
      } catch (reason) {
        if (live && (reason as Error).name !== "RenderingCancelledException") setError(true);
      }
    }
    void draw();
    return () => { live = false; render?.cancel(); text?.cancel(); };
  }, [pdf, number, width, rotation]);
  return <div className={styles.pdfPage} ref={host} role="document" aria-label={`Страница ${number}`} style={{ width, minHeight: width * 1.414 }}>{error && <p role="alert">Не удалось отобразить страницу. Скачайте оригинал PDF с помощью кнопки вверху.</p>}</div>;
}

export default function PDFViewer({ src, zoom, rotation, onPageCount }: { src: string; zoom: number; rotation: number; onPageCount: (count: number) => void }) {
  const shell = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const update = () => setWidth(Math.min(840, Math.max(240, el.clientWidth - (el.clientWidth < 600 ? 24 : 64))));
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    let task: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | undefined;
    setError(false);
    setPdf(null);
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!live) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ url: src, standardFontDataUrl: "/pdfjs/standard_fonts/", wasmUrl: "/pdfjs/wasm/" });
        const document = await task.promise;
        if (live) { setPdf(document); onPageCount(document.numPages); }
      } catch { if (live) setError(true); }
    }
    void load();
    return () => { live = false; void task?.destroy(); };
  }, [src, onPageCount, attempt]);
  return <div className={styles.pdfViewport} ref={shell}>
    {error ? <div className={styles.loadState} role="alert"><strong>Не удалось открыть PDF</strong><p>Попробуйте ещё раз или скачайте оригинал документа.</p><button type="button" onClick={() => setAttempt(a => a + 1)}>Повторить</button><a href={src} download>Скачать PDF</a></div> : !pdf ? <div className={styles.loadState} role="status">Загружаем документ…</div> : <div className={styles.pdfStack}>{Array.from({ length: pdf.numPages }, (_, index) => <PDFPage key={index} pdf={pdf} number={index + 1} width={width * zoom / 100} rotation={rotation} />)}</div>}
  </div>;
}
