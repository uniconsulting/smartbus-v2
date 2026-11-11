"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import "./hero-metrics.css";

type Metric = { value: number | string; suffix?: string; lines: [string, string] };
const pages: Metric[][] = [
  [
    { value: 200, suffix: "+", lines: ["Регулярных", "маршрутов"] },
    { value: 250, suffix: "+", lines: ["Единиц", "транспорта"] },
  ],
  [
    { value: "24/7", lines: ["Круглосуточная", "диспетчерская"] },
    { value: 12, lines: ["Лет опыта", "работы"] },
  ],
];

export function HeroMetrics() {
  const [page, setPage] = useState(0);
  const group = useRef<HTMLDivElement>(null);
  const pair = pages[page];

  useEffect(() => {
    const element = group.current;
    if (!element) return;

    const counters = element.querySelectorAll<HTMLElement>('[data-active="true"] .sb-count-digits');
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function finish() {
      clearTimeout(timer);
      for (const counter of counters) counter.dataset.countFinished = "";
    }

    function start() {
      if (motion.matches) {
        finish();
        return;
      }
      // Let the new pair become legible before its digits begin moving.
      timer = setTimeout(() => {
        if (cancelled) return;
        for (const counter of counters) {
          if (!counter.hasAttribute("data-count-finished")) counter.dataset.countStarted = "";
        }
      }, page === 0 ? 160 : 460);
    }

    function onPreferenceChange() {
      if (motion.matches) finish();
    }

    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry], watch) => {
      if (entry.intersectionRatio >= .25) {
        start();
        watch.disconnect();
      }
    }, { threshold: .25 }) : null;

    // Static totals stay visible until the display font and visible pair are ready.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      if (observer) observer.observe(element);
      else start();
    });
    motion.addEventListener("change", onPreferenceChange);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer?.disconnect();
      for (const counter of counters) {
        if (counter.hasAttribute("data-count-started")) counter.dataset.countFinished = "";
      }
      motion.removeEventListener("change", onPreferenceChange);
    };
  }, [page]);

  return (
    <div ref={group} className="sb-metrics" role="group" aria-label="SmartBus в цифрах">
      <div id="sb-hero-metric-pages" className="sb-metric-pair" aria-hidden="true">
        {pair.map((_, column) => (
          <div className="sb-metric" key={column}>
            {pages.map((metrics, index) => {
              const metric = metrics[column];
              return (
                <div className="sb-metric-content" key={metric.value} data-active={index === page}>
                  <strong>
                    {typeof metric.value === "number" ? (
                      <span className="sb-count-digits"
                        style={{ "--sb-count-duration": metric.value === 12 ? "1400ms" : "1860ms" } as CSSProperties}
                        onAnimationEnd={(event) => {
                          if (event.animationName === "sb-digit-roll" &&
                            (event.target as HTMLElement).hasAttribute("data-count-last")) {
                            event.currentTarget.dataset.countFinished = "";
                          }
                        }}>
                        {String(metric.value).split("").map((digit, digitIndex, digits) => {
                          // The narrow BICUBIK 1 gets a single restrained pass; other glyphs
                          // make one turn. Start/end glyphs match the reserved real text.
                          const steps = digit === "1" ? [digit, digit] : Array.from({ length: 11 }, (_, step) => String((Number(digit) + step) % 10));
                          return (
                            <span className="sb-count-digit" key={digitIndex}
                              style={{ "--sb-digit-delay": `${digitIndex * 90}ms`, "--sb-digit-steps": steps.length - 1 } as CSSProperties}>
                              <span className="sb-count-final">{digit}</span>
                              <span className="sb-count-window" aria-hidden="true">
                                <span className="sb-count-reel" data-count-last={digitIndex === digits.length - 1 ? "" : undefined}>
                                  {steps.map((step, index) => <span key={index}>{step}</span>)}
                                </span>
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    ) : metric.value}{metric.suffix}
                  </strong>
                  <span>{metric.lines[0]}<br />{metric.lines[1]}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        Страница {page + 1} из {pages.length}. {pair.map((metric) => `${metric.value}${metric.suffix ?? ""} — ${metric.lines.join(" ")}`).join(". ")}
      </span>
      <button
        className="sb-metric-next"
        type="button"
        aria-label="Следующие показатели SmartBus"
        aria-controls="sb-hero-metric-pages"
        onClick={() => setPage((current) => (current + 1) % pages.length)}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" strokeWidth={3} />
      </button>
    </div>
  );
}
