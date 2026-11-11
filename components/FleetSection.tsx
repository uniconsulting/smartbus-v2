"use client";

import Image from "next/image";
import { useState } from "react";
import { Bus } from "@phosphor-icons/react";
import styles from "./FleetSection.module.css";

export type FleetTransportId = "coach" | "midi" | "minibus";

type FleetItem = {
  id: FleetTransportId;
  title: string;
  capacity: string;
  seats: string;
  description: string;
  image: string;
  width: number;
  height: number;
};

const fleet: FleetItem[] = [
  {
    id: "coach",
    title: "Большой автобус",
    capacity: "50",
    seats: "от 49 до 57 пассажиров",
    description: "Для корпоративных мероприятий, крупных смен и междугородних поездок.",
    image: "/fleet-coach.png",
    width: 1774,
    height: 887,
  },
  {
    id: "midi",
    title: "Средний автобус",
    capacity: "30",
    seats: "от 25 до 35 пассажиров",
    description: "Для регулярной доставки команды на производство, склад или в офис.",
    image: "/fleet-midibus.png",
    width: 1536,
    height: 1024,
  },
  {
    id: "minibus",
    title: "Микроавтобус",
    capacity: "19",
    seats: "от 17 до 20 пассажиров",
    description: "Манёвренное решение для небольших команд и сложных городских маршрутов.",
    image: "/fleet-minibus.png",
    width: 1536,
    height: 1024,
  },
];

type FleetSectionProps = {
  onSelectTransport?: (transport: FleetTransportId) => void;
  requestTargetId?: string;
};

export default function FleetSection({
  onSelectTransport,
  requestTargetId = "contact",
}: FleetSectionProps) {
  const [activeFleet, setActiveFleet] = useState<FleetTransportId>("coach");

  function requestCalculation(transport: FleetTransportId) {
    onSelectTransport?.(transport);
    document.getElementById(requestTargetId)?.scrollIntoView({ block: "start" });
  }

  return (
    <section className={styles.section} id="fleet" aria-labelledby="fleet-title">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 id="fleet-title">
            Транспорт для каждого маршрута
          </h2>
          <p className={styles.intro}>
            От микроавтобуса для небольшой команды до полноразмерного автобуса на 57 мест.
            Выберите формат — маршрут и график настроим под вас.
          </p>
        </div>

        <div className={styles.accordion} data-active={fleet.findIndex((item) => item.id === activeFleet)}>
          {fleet.map((item) => {
            const isActive = activeFleet === item.id;
            const detailsId = `fleet-details-${item.id}`;

            return (
              <article
                key={item.id}
                className={`${styles.panel} ${isActive ? styles.active : ""}`}
                onMouseEnter={() => {
                  if (window.matchMedia("(min-width: 601px) and (hover: hover)").matches) {
                    setActiveFleet(item.id);
                  }
                }}
                onFocus={() => setActiveFleet(item.id)}
              >
                <div className={styles.pattern} aria-hidden="true" />
                <span className={styles.capacity} aria-hidden="true">{item.capacity}</span>
                <Image
                  src={item.image}
                  alt={item.title}
                  width={item.width}
                  height={item.height}
                  sizes="(max-width: 780px) 92vw, 62vw"
                  className={styles.vehicle}
                />
                <div className={styles.shade} aria-hidden="true" />

                <div className={styles.control}>
                  <div className={styles.copy}>
                    <button
                      className={styles.toggle}
                      type="button"
                      onClick={() => setActiveFleet(item.id)}
                      aria-expanded={isActive}
                      aria-controls={detailsId}
                    >
                      <span className={styles.title}>
                        <Bus size={25} aria-hidden="true" />
                        <span>{item.title}</span>
                      </span>
                    </button>

                    <div className={styles.details} id={detailsId} aria-hidden={!isActive}>
                      <p>{item.description}</p>
                      <div className={styles.meta}>
                        <span>{item.seats}</span>
                      </div>
                      <button className={styles.request} type="button" tabIndex={isActive ? 0 : -1} onClick={() => requestCalculation(item.id)}>
                        Рассчитать
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
