"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import styles from "./ProcessFolder.module.css";


const steps = [
  { number: "01", title: "Расскажите о задаче", description: <>Оставьте маршрут, время и количество пассажиров.<br />Можно начать с приблизительных данных.</> },
  { number: "02", title: "Получите расчёт", description: "Уточняем детали и готовим коммерческое предложение с понятным составом цены." },
  { number: "03", title: "Согласуйте условия", description: "Фиксируем график, класс транспорта, условия оплаты и документы в договоре." },
  { number: "04", title: "Поездка под контролем", description: "Назначаем транспорт и водителя, передаём контакт ответственного за рейс." },
  { number: "05", title: "Закрывающие документы", description: "Передаём комплект документов согласно договору для вашей бухгалтерии." },
];

export default function ProcessFolder() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    let next = activeTab;
    if (event.key === "ArrowRight") next = (activeTab + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (activeTab - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  }

  const current = steps[activeTab];

  return (
    <section className="sb-section" id="process" aria-labelledby="process-title">
        <div className="sb-heading">
          <h2 id="process-title">Итоговый<br/> маршрут взаимодействия</h2>
          <p>Пять понятных шагов<br/> — от первых вводных<br/> до закрывающих документов.</p>
        </div>

        <svg className={styles.filterDefinition} aria-hidden="true" focusable="false">
          <defs>
            <filter id="process-folder-goo" x="-8%" y="-12%" width="116%" height="124%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
            </filter>
          </defs>
        </svg>

        <div className={styles.folder} data-enter>
          <div className={styles.silhouette} aria-hidden="true">
            <div className={styles.tabShape} style={{ transform: `translateX(${activeTab * 100}%)` }} />
            <div className={styles.bodyShape} />
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Этапы работы" onKeyDown={handleTabKeys}>
            {steps.map((step, index) => (
              <button
                className={styles.tab}
                type="button"
                role="tab"
                id={`process-tab-${index}`}
                aria-label={`${step.number}. ${step.title}`}
                aria-selected={activeTab === index}
                aria-controls="process-panel"
                tabIndex={activeTab === index ? 0 : -1}
                ref={(element) => { tabRefs.current[index] = element; }}
                onClick={() => setActiveTab(index)}
                key={step.number}
              >
                {step.number}
              </button>
            ))}
          </div>

          <div className={styles.panel} role="tabpanel" id="process-panel" aria-labelledby={`process-tab-${activeTab}`} tabIndex={0}>
            <div className={styles.panelContent} key={current.number}>
              <span className={styles.number} aria-hidden="true">{current.number}</span>
              <h3>{current.title}</h3>
              <p>{current.description}</p>
            </div>
          </div>
        </div>
    </section>
  );
}
