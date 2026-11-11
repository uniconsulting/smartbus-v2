"use client";

import { useId, useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import styles from "./TrackingCarousel.module.css";

const screens = [
  { id: "schedule", label: "Расписание", alt: "Расписание рейсов в приложении SMARTBUS" },
  { id: "stops", label: "Остановки", alt: "Время и место остановок в приложении SMARTBUS" },
  { id: "route", label: "Маршрут на карте", alt: "Маршрут на карте в приложении SMARTBUS" },
];

type TrackingCarouselProps = {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

/** The preview is controlled by the existing tracking modes; it never sizes its parent. */
export function TrackingCarousel({ activeIndex, onActiveIndexChange }: TrackingCarouselProps) {
  const statusId = useId();
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const selected = (activeIndex % screens.length + screens.length) % screens.length;
  const next = (selected + 1) % screens.length;
  const previous = (selected - 1 + screens.length) % screens.length;
  const select = (index: number) => onActiveIndexChange((index + screens.length) % screens.length);

  return (
    <div className={styles.carousel} role="region" aria-roledescription="карусель"
      aria-label="Экраны приложения SMARTBUS" aria-describedby={statusId} tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(selected + (event.key === "ArrowRight" ? 1 : -1));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          select(event.key === "Home" ? 0 : screens.length - 1);
        }
      }}
      onPointerDown={(event) => {
        swiped.current = false;
        if (event.isPrimary && event.button === 0) {
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }
      }}
      onPointerUp={(event) => {
        const start = pointer.current;
        pointer.current = null;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          select(selected + (dx < 0 ? 1 : -1));
        }
      }}
      onPointerCancel={() => { pointer.current = null; }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") pointer.current = null; }}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault();
          event.stopPropagation();
          swiped.current = false;
        }
      }}>
      <div className={styles.backplate} aria-hidden="true" />
      <div className={styles.stage}>
        {screens.map((screen, index) => {
          const position = index === selected ? "active" : index === next ? "after" : "before";
          return (
            <button key={screen.id} type="button" className={styles.phone} data-position={position}
              aria-label={index === selected ? `Следующий экран после «${screen.label}»` : `Показать экран «${screen.label}»`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => select(index === selected ? next : index)}>
              <Image className={styles.image} src={"/home/mobility/" + screen.id + ".webp"}
                alt={screen.alt} width={454} height={990} quality={92} draggable={false}
                sizes="(max-width: 999px) 35vw, (max-width: 1279px) 22vw, (min-width: 3840px) 720px, 20vw" />
            </button>
          );
        })}
      </div>
      <div className={styles.controls} role="group" aria-label="Переключить экран приложения">
        <button type="button" onClick={() => select(previous)} aria-label="Предыдущий экран">
          <HugeiconsIcon icon={ArrowLeft02Icon} aria-hidden="true" />
        </button>
        <div className={styles.dots}>
          {screens.map((screen, index) => (
            <button type="button" key={screen.id} data-active={selected === index}
              aria-current={selected === index ? "true" : undefined}
              aria-label={`Экран ${index + 1}: ${screen.label}`} onClick={() => select(index)} />
          ))}
        </div>
        <button type="button" onClick={() => select(next)} aria-label="Следующий экран">
          <HugeiconsIcon icon={ArrowRight02Icon} aria-hidden="true" />
        </button>
      </div>
      <span className={styles.status} id={statusId} role="status" aria-live="polite" aria-atomic="true">
        {screens[selected].label}. Экран {selected + 1} из {screens.length}.
      </span>
    </div>
  );
}
