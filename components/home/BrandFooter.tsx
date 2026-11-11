"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { usePublicContacts } from "@/components/ContactProvider";
import "./contact-footer.css";
const footerNav = [
  [{ href: "#services", text: "Услуги" }, { href: "#transport", text: "Транспорт" },
    { href: "#tracking", text: "Приложение" }, { href: "#process", text: "Как работаем" }],
  [{ href: "#geography", text: "География" }, { href: "/documents", text: "Документы" },
    { href: "/contacts", text: "Контакты" }, { href: "#faq", text: "Вопросы" }],
];

const footerVehicles = [
  { type: "coach", width: 244, height: 72 },
  { type: "citybus", width: 170, height: 60 },
  { type: "shuttle", width: 146, height: 56 },
];

function FooterTraffic() {
  const roadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const road = roadRef.current;
    if (!road || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      road.toggleAttribute("data-parked", !entry.isIntersecting);
    });
    observer.observe(road);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={roadRef} className="sb-footer-road" aria-hidden="true">
      {footerVehicles.map(({ type, width, height }) => (
        <span className="sb-footer-vehicle" data-kind={type} key={type}>
          <img src={`/home/footer/${type}.svg`} width={width} height={height} alt="" />
        </span>
      ))}
    </div>
  );
}

export default function BrandFooter({ home = true }: { home?: boolean }) {
  const contacts = usePublicContacts();
  return (
    <footer id="footer" className="sb-section sb-frame sb-footer">
      <div className="sb-footer-top" data-enter>
        <a className="sb-footer-logo" href={home ? "#top" : "/"} aria-label={home ? "SmartBus, в начало страницы" : "SmartBus, на главную"}>
          <img src="/home/brand/logo.svg" width="240" height="60" alt="SmartBus" />
        </a>
        <FooterTraffic />
        <a className="sb-footer-back" href="#top">Наверх <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" /></a>
      </div>

      <div className="sb-footer-info" data-enter>
        <div className="sb-footer-office">
          <p>Корпоративные перевозки <br />по Москве и Московской области</p>
          <address>{contacts.officeAddress} <br />({contacts.officeBuilding})</address>
        </div>
        <nav className="sb-footer-nav" aria-label="Навигация в подвале">
          {footerNav.map((group) => (
            <div key={group[0].href}>{group.map((link) => <Link key={link.href} prefetch={false} href={!home && link.href.startsWith("#") ? `/${link.href}` : link.href}>{link.text}</Link>)}</div>
          ))}
        </nav>
      </div>

      <nav className="sb-footer-legal" data-enter aria-label="Юридическая информация">
        <Link prefetch={false} href="/documents/terms">Пользовательское соглашение</Link>
        <Link prefetch={false} href="/documents/privacy">Политика обработки данных</Link>
        <Link prefetch={false} href="/documents/cookies">Политика cookie</Link>
        <CookieSettingsButton />
      </nav>
      <div className="sb-footer-fineprint" data-enter>
        <p>© {new Date().getFullYear()} ООО «СмартБас» <span>| ИНН 7729457334</span> <span>| ОГРН 1157746344733.</span></p>
        <p>Информация на сайте не является публичной офертой.</p>
      </div>
      <img className="sb-footer-wordmark" data-enter="fade" src="/home/footer/wordmark.svg" width="1178" height="124" alt="" aria-hidden="true" />
    </footer>
  );
}

