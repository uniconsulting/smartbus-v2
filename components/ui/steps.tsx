"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Steps } from "@ark-ui/react/steps";
import { Check } from "@phosphor-icons/react";
import styles from "./steps.module.css";

const items = [
  { title: "Договорные условия", description: "Понятные обязательства, стоимость и порядок взаимодействия." },
  { title: "Информация о рейсе", description: "Контакты ответственного и данные назначенного транспорта." },
  { title: "Документы для бухгалтерии", description: "Работаем по ЭДО. Состав закрывающих документов согласуется в договоре." },
];

export default function TrustSteps() {
  const [vertical, setVertical] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setVertical(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function handleNavigation(event: KeyboardEvent<HTMLDivElement>) {
    const index = triggers.current.findIndex((trigger) => trigger === event.target);
    if (index < 0) return;
    const previous = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";
    let target: number;
    if (event.key === previous) target = (index + items.length - 1) % items.length;
    else if (event.key === next) target = (index + 1) % items.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items.length - 1;
    else return;
    event.preventDefault();
    setActiveStep(target);
    triggers.current[target]?.focus();
  }

  return (
    <Steps.Root count={items.length} step={activeStep} onStepChange={({ step }) => setActiveStep(step)} orientation={vertical ? "vertical" : "horizontal"} className={styles.root}>
      <Steps.List className={styles.list} aria-label="Документы и информация о перевозке" onKeyDown={handleNavigation}>
        {items.map((item, index) => (
          <Steps.Item key={item.title} index={index} className={styles.item}>
            <Steps.Trigger ref={(element) => { triggers.current[index] = element; }} className={styles.trigger} aria-label={item.title} tabIndex={index === activeStep ? 0 : -1}>
              <Steps.Indicator className={styles.indicator}>
                <span className={styles.number}>0{index + 1}</span>
                <Check className={styles.check} size={21} weight="bold" aria-hidden="true" />
              </Steps.Indicator>
              <span className={styles.copy} aria-hidden="true">
                <span className={styles.title}>{item.title}</span>
                <span className={styles.description}>{item.description}</span>
              </span>
            </Steps.Trigger>
            {index < items.length - 1 && <Steps.Separator className={styles.separator} />}
          </Steps.Item>
        ))}
      </Steps.List>
      {items.map((item, index) => (
        <Steps.Content key={item.title} index={index} className="visually-hidden">
          <p>{item.description}</p>
        </Steps.Content>
      ))}
    </Steps.Root>
  );
}
