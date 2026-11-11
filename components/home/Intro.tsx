"use client";

import Image from "next/image";
import { Fragment } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Airplane01Icon from "@hugeicons/core-free-icons/Airplane01Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Route01Icon from "@hugeicons/core-free-icons/Route01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { EmployeeServiceCard } from "./EmployeeServiceCard";
import BrandHeader from "./BrandHeader";
import { HeroMetrics } from "./HeroMetrics";
import "./intro.css";
import "./pinned-header.css";


const services = [
  {
    title: "Перевозка сотрудников", icon: UserGroupIcon, featured: true,
    lines: ["Маршруты к началу смены и обратно.", "Графики 2/2, 5/2, 7/0, ночные и вахтовые рейсы."],
  },
  {
    title: "Деловые трансферы", icon: Airplane01Icon,
    lines: ["Встречаем командировочных", "и делегации. Планируем путь", "от аэропорта до площадки."],
  },
  {
    title: "Мероприятия", icon: Calendar03Icon,
    lines: ["Собираем расписание рейсов", "под форум, конференцию", "или корпоративный выезд."],
  },
  {
    title: "Групповые поездки", icon: UserMultiple02Icon,
    lines: ["Перевозим команды", "и организованные группы. Условия", "детских поездок согласуем отдельно."],
  },
  {
    title: "Мобильные решения", icon: Route01Icon,
    lines: ["Подбираем транспорт", "для удалённых объектов, вахт", "и специальных проектов."],
  },
];


function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => (
    <Fragment key={line}>{index > 0 && " "}<span className="sb-intro-line">{line}</span></Fragment>
  ));
}


export function Intro() {
  return (
    <>
      <BrandHeader />
      <section id="top" className="sb-section sb-frame sb-intro-hero" aria-labelledby="sb-hero-title">
        <Image src="/home/images/hero.webp" alt="" fill priority fetchPriority="high" quality={85}
          sizes="(max-width: 700px) clamp(1200px, 276vw, 1460px), (max-width: 1279px) max(1460px, min(calc(200dvh - 80px - .10728 * (100vw - 700px)), calc(1460px + .9 * (100vw - 700px)))), (min-width: 3840px) 3627px, 95vw" className="sb-intro-hero-image" />
        <div aria-hidden="true" className="sb-topbar-slot" />
        <div className="sb-hero-message">
          <h1 id="sb-hero-title"><Lines lines={["Корпоративная логистика", "для вашего бизнеса"]} /></h1>
          <p><Lines lines={["Ежедневно доставляем сотрудников", "на работу и домой — безопасно, комфортно", "и точно к началу смены"]} /></p>
        </div>
        <HeroMetrics />
        <div className="sb-cookie-hero-slot" aria-hidden="true" />
      </section>
      <section id="services" className="sb-section sb-services" aria-labelledby="sb-services-title">
        <div className="sb-heading">
          <h2 id="sb-services-title">Форматы<br />услуг</h2>
          <p><Lines lines={["Для каждой задачи", "продумываем маршрут,", "транспорт и график"]} /></p>
        </div>
        <div className="sb-service-grid" data-enter-list>
          {services.map(service => {
            const content = (
              <>
                <HugeiconsIcon className="sb-service-glyph" icon={service.icon} aria-hidden="true" strokeWidth={1.45} />
                <div className="sb-service-text">
                  <h3><a href="#contact" aria-label={`Обсудить услугу «${service.title}»`} onClick={() => {
                    window.dispatchEvent(new CustomEvent("smartbus:inquiry", { detail: { task: service.title } }));
                  }}>{service.title}</a></h3>
                  <p><Lines lines={service.lines} /></p>
                </div>
              </>
            );
            return service.featured ? (
              <EmployeeServiceCard key={service.title}>{content}</EmployeeServiceCard>
            ) : (
              <article key={service.title} className="sb-frame sb-service-tile">{content}</article>
            );
          })}
        </div>
        <p className="sb-service-cta" data-enter>
          <span>Сложный маршрут? <span className="sb-service-cta-accent">Разберём вместе</span></span>
          <a href="#contact"><HugeiconsIcon icon={ArrowRight02Icon} aria-hidden="true" /><span>расскажите о задаче</span></a>
        </p>
      </section>
    </>
  );
}
