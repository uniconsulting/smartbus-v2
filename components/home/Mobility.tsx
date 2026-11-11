"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import Bus01Icon from "@hugeicons/core-free-icons/Bus01Icon";
import Bus02Icon from "@hugeicons/core-free-icons/Bus02Icon";
import VanIcon from "@hugeicons/core-free-icons/VanIcon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import Route02Icon from "@hugeicons/core-free-icons/Route02Icon";
import PlayStoreIcon from "@hugeicons/core-free-icons/PlayStoreIcon";
import AppStoreIcon from "@hugeicons/core-free-icons/AppStoreIcon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon";
import { TrackingCarousel } from "./TrackingCarousel";
import "./mobility.css";

const vehicles = [
  { id: "coach", icon: Bus01Icon, title: "Большой автобус", number: "50", seats: "49 – 57 пассажиров", copy: ["Для корпоративных", "мероприятий, крупных смен", "и междугородних поездок."] },
  { id: "midibus", icon: Bus02Icon, title: "Средний автобус", number: "30", seats: "25 – 35 пассажиров", copy: ["Для регулярной доставки", "команды на производство,", "склад или в офис."] },
  { id: "minibus", icon: VanIcon, title: "Микроавтобус", number: "19", seats: "17 – 20 пассажиров", copy: ["Для небольших команд", "и сложных городских", "маршрутов."] },
];

const modes = [
  { id: "schedule", label: "Расписание", icon: Calendar03Icon, lines: ["Все доступные маршруты и время", "рейсов — в приложении. Сотрудник видит", "актуальный график перед поездкой"] },
  { id: "stops", label: "Остановки", icon: Location01Icon, lines: ["Время и место каждой остановки", "собраны на одном экране. Сотрудник видит,", "где и когда его ждёт автобус"] },
  { id: "route", label: "Маршрут на карте", icon: Route02Icon, lines: ["Точки посадки и схема поездки", "помогают понять путь ещё до выхода", "на остановку"] },
];

const stores = [
  { label: "Google Play", icon: PlayStoreIcon, href: "https://play.google.com/store/apps/details?id=com.app.smartbus&hl=ru" },
  { label: "App Store", icon: AppStoreIcon, href: "https://apps.apple.com/ru/app/smartbus/id6756098244" },
  { label: "RuStore", icon: Store01Icon, href: "https://www.rustore.ru/catalog/app/com.app.smartbus" },
];

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => <span className="sb-mob-line" key={line}>{index > 0 ? " " : ""}{line}</span>);
}

function ArrowLink({ text, task }: { text: string; task?: string }) {
  return (
    <a className="sb-mob-inquiry" href="#contact"
      onClick={() => { if (task) window.dispatchEvent(new CustomEvent("smartbus:inquiry", { detail: { task } })); }}>
      {text}<HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden="true" />
    </a>
  );
}

function Transport() {
  const [active, setActive] = useState(0);

  return (
    <section id="transport" className="sb-section sb-mob-transport" aria-labelledby="sb-transport-title">
      <span id="fleet" className="sb-mob-alias" aria-hidden="true" />
      <div className="sb-heading">
        <h2 id="sb-transport-title">Виды<br />транспорта</h2>
        <p><Lines lines={["Выбор транспорта", "для точных задач", "Вашего бизнеса"]} /></p>
      </div>
      <div className="sb-frame sb-fleet-grid" data-enter data-active={active}>
        {vehicles.map((vehicle, index) => {
          const isActive = active === index;
          const panelId = "sb-details-" + vehicle.id;
          return (
            <article key={vehicle.id} className="sb-fleet-panel" data-open={isActive}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (min-width: 1280px)").matches) setActive(index);
              }}>
              <div className="sb-fleet-pattern" aria-hidden="true" />
              <span className="sb-fleet-number" data-leading={vehicle.number[0]} aria-hidden="true">{vehicle.number}</span>
              <div className="sb-fleet-art" aria-hidden="true">
                <Image className="sb-fleet-image" src={"/home/images/" + vehicle.id + ".webp"} alt="" quality={92}
                  width={vehicle.id === "minibus" ? 1752 : 1774} height={vehicle.id === "minibus" ? 897 : 887}
                  sizes="(max-width: 999px) 76vw, (max-width: 1279px) 52vw, (min-width: 3840px) 1480px, 39vw" />
              </div>
              <button type="button" className="sb-fleet-open" aria-expanded={isActive} aria-controls={panelId}
                aria-label={vehicle.title} onClick={() => setActive(index)}>
                <span className="sb-fleet-side-label" aria-hidden="true"><HugeiconsIcon icon={vehicle.icon} />{vehicle.title}</span>
              </button>
              <div className="sb-fleet-copy" id={panelId} inert={!isActive}>
                <h3><HugeiconsIcon icon={vehicle.icon} aria-hidden="true" />{vehicle.title}</h3>
                <p className="sb-fleet-seats">{vehicle.seats}</p>
                <p className="sb-fleet-description"><Lines lines={vehicle.copy} /></p>
                <ArrowLink text="Рассчитать" task={"Хочу рассчитать маршрут. Транспорт — " + vehicle.title.toLowerCase() + "."} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Tracking() {
  const [active, setActive] = useState(0);

  return (
    <section id="tracking" className="sb-section sb-mob-tracking" aria-labelledby="sb-tracking-title">
      <span id="app" className="sb-mob-alias" aria-hidden="true" />
      <div className="sb-heading">
        <h2 id="sb-tracking-title">Отслеживание<br />и контроль</h2>
        <p aria-live="polite"><Lines lines={modes[active].lines} /></p>
      </div>
      <div className="sb-track-layout">
        <div className="sb-track-tools">
          <div className="sb-track-intro" data-enter>
            <p>Сотрудники вашего предприятия<br className="sb-mob-break" /> видят актуальное расписание и свой маршрут<br className="sb-mob-break" /> в приложении <b>SMARTBUS</b>.</p>
            <p>Меньше вопросов перед поездкой<br className="sb-mob-break" /> — больше ясности на каждом этапе.</p>
          </div>
          <div className="sb-track-modes" data-enter-list role="group" aria-label="Экраны приложения">
            {modes.map((mode, index) => (
              <button key={mode.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>
                <span className="sb-track-icon"><HugeiconsIcon icon={mode.icon} aria-hidden="true" /></span>
                {mode.label}
              </button>
            ))}
          </div>
          <nav className="sb-track-stores" data-enter aria-label="Скачать приложение SMARTBUS">
            {stores.map((store) => (
              <a key={store.label} href={store.href} target="_blank" rel="noopener noreferrer" aria-label={"Скачать SMARTBUS в " + store.label}>
                <HugeiconsIcon icon={store.icon} aria-hidden="true" />{store.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="sb-frame sb-track-preview" data-enter>
          <TrackingCarousel activeIndex={active} onActiveIndexChange={setActive} />
        </div>
      </div>
    </section>
  );
}

type City = { name: string; lat: number; lon: number; side?: "left"; dy?: number };

// Coordinates and service areas from the original SmartBus coverage map.
const cities: City[] = [
  { name: "Москва", lat: 55.7558, lon: 37.6176, dy: 24 },
  { name: "Волоколамск", lat: 56.0336, lon: 35.9694 },
  { name: "Дмитров", lat: 56.344, lon: 37.52 },
  { name: "Красногорск", lat: 55.82, lon: 37.329, side: "left", dy: 12 },
  { name: "Ногинск", lat: 55.857, lon: 38.44 },
  { name: "Серпухов", lat: 54.915, lon: 37.413 },
  { name: "Истра", lat: 55.917, lon: 36.868, side: "left", dy: -9 },
];
const areaCities: City[] = [
  { name: "Дубна", lat: 56.744, lon: 37.173 },
  { name: "Коломна", lat: 55.103, lon: 38.753, side: "left" },
  { name: "Луховицы", lat: 54.968, lon: 39.026 },
];
const nearbyPlaces: City[] = [
  { name: "Тверь", lat: 56.858, lon: 35.918 },
  { name: "Александров", lat: 56.395, lon: 38.712 },
  { name: "Владимир", lat: 56.129, lon: 40.406 },
  { name: "Вязьма", lat: 55.211, lon: 34.299 },
  { name: "Обнинск", lat: 55.099, lon: 36.613, side: "left" },
  { name: "Алексин", lat: 54.503, lon: 37.067 },
];

const mapSize = { width: 1536, height: 1024 };
const view = { width: 900, height: 570 };
const overview = { x: mapSize.width / 2, y: mapSize.height / 2, zoom: 1 };
type Camera = typeof overview;

function mercator(latitude: number) {
  return 180 / Math.PI * Math.log(Math.tan((90 + latitude) * Math.PI / 360));
}

function project(city: City) {
  // The local basemap uses Web Mercator at 175 design units per longitude degree.
  return {
    x: Number((768 + (city.lon - 37.5) * 175).toFixed(2)),
    y: Number((512 + (mercator(55.72) - mercator(city.lat)) * 175).toFixed(2)),
  };
}

function boundCamera(camera: Camera) {
  const halfW = view.width / (2 * camera.zoom);
  const halfH = view.height / (2 * camera.zoom);
  return {
    zoom: camera.zoom,
    x: Math.min(mapSize.width - halfW, Math.max(halfW, camera.x)),
    y: Math.min(mapSize.height - halfH, Math.max(halfH, camera.y)),
  };
}

function Geography() {
  const section = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState("Москва");
  const [camera, setCamera] = useState<Camera>(overview);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; camera: Camera; scale: number } | null>(null);
  const showArea = selected === "area" || areaCities.some((city) => city.name === selected);
  const activeCity = [...cities, ...areaCities].find((city) => city.name === selected);

  // Keep the ambient effects dormant while the map is outside the viewport.
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      node.toggleAttribute("data-in-view", entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function selectCity(city: City) {
    setSelected(city.name);
    setCamera(boundCamera({ ...project(city), zoom: 1.14 }));
  }

  function selectArea() {
    setSelected("area");
    setCamera({ ...overview, zoom: 0.7 });
  }

  function zoomBy(step: number) {
    setCamera((current) => boundCamera({ ...current, zoom: Math.min(1.9, Math.max(0.65, current.zoom + step)) }));
  }

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest("[role='button']")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, camera, scale: rect.width / view.width };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    const initial = drag.current;
    if (!initial || initial.id !== event.pointerId) return;
    const scale = initial.scale * initial.camera.zoom;
    setCamera(boundCamera({
      zoom: initial.camera.zoom,
      x: initial.camera.x - (event.clientX - initial.x) / scale,
      y: initial.camera.y - (event.clientY - initial.y) / scale,
    }));
  }

  function finishDrag() {
    drag.current = null;
    setDragging(false);
  }

  return (
    <section ref={section} id="geography" className="sb-section sb-mob-geography" aria-labelledby="sb-geography-title">
      <span id="coverage" className="sb-mob-alias" aria-hidden="true" />
      <div className="sb-heading">
        <h2 id="sb-geography-title">География<br />перевозок</h2>
        <p><Lines lines={["Для регулярных перевозок", "под сменный график подготовим", "индивидуальное предложение."]} /></p>
      </div>
      <div className="sb-frame sb-geo-layout">
        <div className="sb-geo-list" data-enter role="group" aria-label="Выбрать город на карте">
          {cities.map((city) => (
            <button key={city.name} type="button" aria-pressed={city.name === selected} onClick={() => selectCity(city)}>
              <span aria-hidden="true" />{city.name}
            </button>
          ))}
          <button type="button" className="sb-geo-others" aria-pressed={showArea} onClick={selectArea}><span aria-hidden="true" />и другие города Мос. области</button>
        </div>
        <div className="sb-frame sb-geo-map" data-enter="fade">
          <svg className="sb-geo-canvas" viewBox="0 0 900 570" role="group" aria-label="Интерактивная карта городов обслуживания"
            onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
            <g className="sb-geo-scene" data-dragging={dragging} style={{
              transform: "translate(" + (450 - camera.x * camera.zoom) + "px, " + (285 - camera.y * camera.zoom) + "px) scale(" + camera.zoom + ")",
            }}>
              <foreignObject width={mapSize.width} height={mapSize.height} pointerEvents="none">
                <Image src="/home/mobility/moscow-region.webp" alt="" width={mapSize.width} height={mapSize.height} quality={92}
                  sizes="(max-width: 999px) 170vw, (max-width: 1279px) 120vw, (min-width: 3840px) 4096px, 110vw" style={{ width: "100%", height: "100%" }} />
              </foreignObject>
              {nearbyPlaces.map((city) => {
                const point = project(city);
                return <text className="sb-geo-nearby" key={city.name} x={point.x} y={point.y} textAnchor="middle">{city.name}</text>;
              })}
              {[...cities, ...areaCities].map((city) => {
                const point = project(city);
                const isSelected = selected === city.name;
                const isOther = areaCities.includes(city);
                const left = city.side === "left";
                return (
                  <g key={city.name} className="sb-geo-pin" data-selected={isSelected} data-muted={isOther && !showArea}
                    role="button" tabIndex={isOther && showArea ? 0 : -1} aria-label={"Выбрать город " + city.name}
                    transform={"translate(" + point.x + " " + point.y + ")"} onClick={() => selectCity(city)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCity(city); } }}>
                    <g transform={"scale(" + (1 / camera.zoom) + ")"}>
                      <circle className="sb-geo-hit" r="16" />
                      {isSelected && <circle className="sb-geo-halo" r="16" />}
                      <circle className="sb-geo-dot" r={isSelected ? 7 : 4.5} />
                      <text className="sb-geo-label" x={left ? -11 : 11} y={city.dy ?? -7} textAnchor={left ? "end" : "start"}>{city.name}</text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="sb-geo-zoom" role="group" aria-label="Масштаб карты">
            <button type="button" onClick={() => zoomBy(0.25)} disabled={camera.zoom >= 1.9} aria-label="Приблизить карту"><HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" /></button>
            <button type="button" onClick={() => zoomBy(-0.25)} disabled={camera.zoom <= 0.65} aria-label="Отдалить карту"><HugeiconsIcon icon={MinusSignIcon} aria-hidden="true" /></button>
          </div>
          <div className="sb-geo-source">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>
          </div>
        </div>
      </div>
      <ArrowLink text="Обсудить свой маршрут" task={activeCity ? "Интересуют перевозки. Город — " + activeCity.name + "." : undefined} />
    </section>
  );
}

export function Mobility() {
  return <><Transport /><Tracking /><Geography /></>;
}
