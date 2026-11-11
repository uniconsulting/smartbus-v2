"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

export function EmployeeServiceCard({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const motion = window.matchMedia("(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function updateTilt() {
      frame = 0;
      // Measure the stationary grid cell so the rotating face cannot move its own origin.
      const cell = stageRef.current;
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, 2 * (pointerX - rect.left) / rect.width - 1));
      const y = Math.max(-1, Math.min(1, 2 * (pointerY - rect.top) / rect.height - 1));
      const depth = 12 - 5 * Math.min(1, Math.hypot(x, y));
      cell.style.setProperty("--service-x", x.toFixed(4));
      cell.style.setProperty("--service-y", y.toFixed(4));
      cell.style.setProperty("--service-depth", depth.toFixed(2));
      cell.dataset.tilting = "true";
    }

    function track(event: PointerEvent) {
      if (!motion.matches || event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(updateTilt);
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      stageRef.current?.removeAttribute("data-tilting");
    }

    stage.addEventListener("pointerenter", track);
    stage.addEventListener("pointermove", track);
    stage.addEventListener("pointerleave", reset);
    stage.addEventListener("pointercancel", reset);
    motion.addEventListener("change", reset);
    window.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointerenter", track);
      stage.removeEventListener("pointermove", track);
      stage.removeEventListener("pointerleave", reset);
      stage.removeEventListener("pointercancel", reset);
      motion.removeEventListener("change", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return (
    <div className="sb-service-stage" ref={stageRef}>
      <article className="sb-frame sb-service-tile sb-service-feature">
        <Image src="/home/images/services.webp" alt="" fill quality={85} fetchPriority="low"
          sizes="(max-width: 700px) max(94vw, 664px), (max-width: 1279px) 95vw, (min-width: 3840px) 2400px, 63vw" className="sb-service-photo" />
        {children}
      </article>
    </div>
  );
}
