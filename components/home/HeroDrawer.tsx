"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Menu02Icon from "@hugeicons/core-free-icons/Menu02Icon";
import { usePublicContacts } from "@/components/ContactProvider";
import { phoneHref } from "@/lib/public-contacts";
import "./hero-drawer.css";

const pages = [
  { label: "Статьи", href: "/articles", description: "Практические материалы о перевозках" },
  { label: "Документы", href: "/documents", description: "Реквизиты, политика и согласия" },
  { label: "Контакты", href: "/contacts", description: "Телефоны, почта и офис на карте" },
];

type DrawerProps = {
  anchors: ReadonlyArray<{ label: string; href: string }>;
};

export function HeroDrawer({ anchors }: DrawerProps) {
  const contacts = usePublicContacts();
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function showDrawer() {
    trigger.current?.focus({ preventScroll: true });
    dialog.current?.showModal();
    setOpen(true);
  }

  function closeDrawer() {
    const element = dialog.current;
    if (!element?.open || element.hasAttribute("data-exiting")) return;
    element.setAttribute("data-exiting", "");
    const sheet = element.firstElementChild;
    const transitions = sheet?.getAnimations() ?? [];
    void Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => {
      if (element.open) element.close();
      element.removeAttribute("data-exiting");
    });
  }

  function loopTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]"))
      .filter((control) => control.getClientRects().length > 0);
    const boundary = event.shiftKey ? controls[0] : controls.at(-1);
    if (document.activeElement !== boundary) return;
    event.preventDefault();
    (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
  }

  return (
    <>
      <button ref={trigger} type="button" className="sb-nav-icon" aria-label="Открыть меню"
        aria-controls="sb-drawer" aria-haspopup="dialog" aria-expanded={open} onClick={showDrawer}>
        <HugeiconsIcon icon={Menu02Icon} aria-hidden="true" />
      </button>
      <dialog id="sb-drawer" ref={dialog} className="sb-hero-drawer" aria-label="Меню сайта"
        onClose={() => {
          setOpen(false);
          if (document.activeElement === document.body) trigger.current?.focus({ preventScroll: true });
        }}
        onKeyDown={loopTab}
        onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
        <div className="sb-hero-drawer-sheet">
          <div className="sb-hero-drawer-head">
            <Link href="/" prefetch={false} aria-label="SmartBus — на главную" onNavigate={closeDrawer}><img src="/home/brand/logo.svg" width="174" height="43" alt="SmartBus" /></Link>
            <button type="button" className="sb-hero-drawer-close" aria-label="Закрыть меню"
              autoFocus onClick={closeDrawer}>
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
            </button>
          </div>

          <div className="sb-hero-drawer-navigation">
            <nav className="sb-hero-drawer-pages" aria-label="Дополнительные страницы">
              {pages.map(({ label, href, description }) => (
                <Link key={href} href={href} prefetch={false} onNavigate={closeDrawer} aria-current={pathname === href || pathname?.startsWith(`${href}/`) ? "page" : undefined}>
                  <strong>{label}</strong>
                  <small>{description}</small>
                  <HugeiconsIcon icon={ArrowRight02Icon} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <nav className="sb-hero-drawer-anchors" aria-label="Разделы главной страницы">
              {anchors.map(({ label, href }) => (
                <a key={href} href={href} onClick={closeDrawer}>{label}</a>
              ))}
            </nav>
          </div>

          <address className="sb-hero-drawer-contact">
            <a href={phoneHref(contacts.phone)}>{contacts.phone}</a>
            <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
          </address>
        </div>
      </dialog>
    </>
  );
}
