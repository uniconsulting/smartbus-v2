"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Call02Icon from "@hugeicons/core-free-icons/Call02Icon";
import Message02Icon from "@hugeicons/core-free-icons/Message02Icon";
import { usePublicContacts } from "@/components/ContactProvider";
import { phoneHref } from "@/lib/public-contacts";
import { HeroDrawer } from "./HeroDrawer";
import "./intro.css";
import "./pinned-header.css";
const HeaderGlass = dynamic(() => import("./HeaderGlass").then((module) => module.HeaderGlass), {
  ssr: false,
  loading: () => <div className="sb-header-glass" aria-hidden="true" />,
});

const anchors = [
  { label: "Услуги", href: "#services" },
  { label: "Отслеживание", href: "#tracking" },
  { label: "География", href: "#geography" },
];

export default function BrandHeader({ home = true }: { home?: boolean }) {
  const contacts = usePublicContacts();
  const links = anchors.map(link => ({ ...link, href: home ? link.href : `/${link.href}` }));
  const pinRef = useRef<HTMLDivElement>(null);
  const [glassNeeded, setGlassNeeded] = useState(!home);

  useEffect(() => {
    const pin = pinRef.current;
    const services = document.getElementById("services");
    if (!home || !pin || !services) return;

    let extremeY = Math.max(0, window.scrollY);
    let goingDown = true;
    let anchorInset = 0;
    let frame = 0;

    const update = () => {
      frame = 0;
      // Ignore rubber-band overscroll and tiny direction changes on trackpads.
      const scrollRoot = document.scrollingElement ?? document.documentElement;
      const y = Math.max(0, Math.min(window.scrollY, scrollRoot.scrollHeight - scrollRoot.clientHeight));
      const delta = y - extremeY;
      if (delta >= 8 || delta <= -4) goingDown = delta > 0;
      extremeY = goingDown ? Math.max(extremeY, y) : Math.min(extremeY, y);

      const docked = y > 0;
      const pastHero = services.getBoundingClientRect().top <= anchorInset + 1;
      if (docked && !pin.hasAttribute("data-docked")) setGlassNeeded(true);
      pin.toggleAttribute("data-docked", docked);
      pin.toggleAttribute("data-scroll-hidden", docked && pastHero && goingDown);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const measure = () => {
      anchorInset = parseFloat(getComputedStyle(services).scrollMarginTop) || 0;
      schedule();
    };
    const restore = () => {
      goingDown = true;
      extremeY = Math.max(0, window.scrollY);
      measure();
    };

    pin.setAttribute("data-ready", "");
    restore();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pageshow", restore);
    window.addEventListener("hashchange", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("hashchange", schedule);
    };
  }, [home]);

  return (
    <div className="sb-header-pin" ref={pinRef} data-ready={!home || undefined} data-docked={!home || undefined}>
      <header className="sb-topbar">
        {glassNeeded ? <HeaderGlass /> : <div className="sb-header-glass" aria-hidden="true" />}
        <div className="sb-topbar-start">
          <HeroDrawer anchors={links} />
          <nav className="sb-header-anchors" aria-label="Разделы главной">
            {links.map(({ label, href }) => <a key={href} href={href}><span>{label}</span></a>)}
          </nav>
        </div>
        <a href={home ? "#top" : "/"} className="sb-header-logo" aria-label={home ? "SmartBus — в начало страницы" : "SmartBus — на главную"}>
          <Image src="/home/brand/logo.svg" alt="" width={190} height={62} unoptimized />
        </a>
        <div className="sb-topbar-actions">
          <a href={home ? "#contact" : "/#contact"} aria-label="Написать нам"><HugeiconsIcon icon={Message02Icon} aria-hidden="true" /><span>Написать нам</span></a>
          <span className="sb-topbar-divider" aria-hidden="true" />
          <a href={phoneHref(contacts.phone)} aria-label={`Позвонить ${contacts.phone}`}><HugeiconsIcon icon={Call02Icon} aria-hidden="true" /><span>{contacts.phone}</span></a>
        </div>
      </header>
    </div>
  );
}
