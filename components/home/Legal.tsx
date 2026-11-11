"use client";

import { useEffect, useRef, useState } from "react";
import "./legal.css";

const stages = [
  { title: <>Договорные<br/> условия</>, text: <>Понятные обязательства,<br/> стоимость и порядок<br/> взаимодействия.</> },
  { title: <>Информация<br/> о рейсе</>, text: <>Контакты ответственного<br/> и данные назначенного<br/> транспорта.</> },
  { title: <>Документы<br/> для бухгалтерии</>, text: <>Работаем по ЭДО. Состав<br/> закрывающих документов<br/> согласуется в договоре.</> },
];

export function Legal() {
  const steps = useRef<HTMLOListElement>(null);
  const [reveal, setReveal] = useState<"static" | "waiting" | "playing">("static");
  useEffect(() => {
    if (!steps.current || !("IntersectionObserver" in window)) return;
    setReveal("waiting");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setReveal("playing");
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(steps.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="sb-section sb-frame sb-legal" id="legal" aria-labelledby="legal-title">
      <header className="sb-heading">
        <h2 id="legal-title">Юридическая<br/> чистота</h2>
        <p>SmartBus против коррупции.<br/> Если сделка сомнительна или требует<br/> неофициальных платежей, мы не поедем.</p>
      </header>
      <div className="sb-legal-note" data-enter>
        <p>При согласовании рейса предоставим сведения о транспорте,<br/> водителе и необходимые документы. Конкретные допуски, страховки<br/> и условия мониторинга подтверждаются документально.</p>
      </div>
      <ol ref={steps} className="sb-legal-stages" data-reveal={reveal}>
        {stages.map((stage, index) => (
          <li key={index}>
            <div className="sb-legal-stage-title">
              <span aria-hidden="true">{index + 1}</span>
              <h3>{stage.title}</h3>
            </div>
            <p>{stage.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
