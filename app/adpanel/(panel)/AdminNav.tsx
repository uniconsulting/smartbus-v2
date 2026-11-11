"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon as Icon } from "@hugeicons/react";
import Dashboard from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import News from "@hugeicons/core-free-icons/News01Icon";
import Folder from "@hugeicons/core-free-icons/Folder02Icon";
import Contact from "@hugeicons/core-free-icons/Contact01Icon";
import Chart from "@hugeicons/core-free-icons/AnalyticsUpIcon";
import Search from "@hugeicons/core-free-icons/Search01Icon";
import Plug from "@hugeicons/core-free-icons/Plug01Icon";
import Menu from "@hugeicons/core-free-icons/Menu01Icon";
import Close from "@hugeicons/core-free-icons/Cancel01Icon";
import Logout from "@hugeicons/core-free-icons/Logout03Icon";
import Arrow from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Right from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { signOut } from "./actions";

const groups = [
  { label: "", items: [{ path:"", title:"Обзор", icon: Dashboard }] },
  { label: "Публикации и контакты", items: [
    { path:"articles", title:"Статьи", icon:News }, { path:"documents", title:"Документы", icon:Folder }, { path:"contacts", title:"Контакты", icon:Contact },
  ] },
  { label: "Управление сайтом", items: [
    { path:"analytics", title:"Аналитика", icon:Chart }, { path:"seo", title:"SEO", icon:Search }, { path:"integrations", title:"Интеграции", icon:Plug },
  ] },
];
const all = groups.flatMap(group => group.items);

function NavLabel({ item }: { item: typeof all[number] }) {
  const { pending } = useLinkStatus();
  return <>
    <Icon icon={item.icon} size={19} aria-hidden="true" />
    <span>{item.title}</span>
    <span className="admin-nav-marker" data-pending={pending || undefined} aria-hidden="true" />
  </>;
}

export default function AdminNav({ login }: { login: string }) {
  const pathname = usePathname();
  const section = pathname?.split("/")[2] || "";
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const rail = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 780px)");
    function updateSize() {
      setCompact(media.matches);
      if (!media.matches) setExpanded(false);
    }
    updateSize();
    media.addEventListener("change", updateSize);
    return () => media.removeEventListener("change", updateSize);
  }, []);

  useEffect(() => { setExpanded(false); }, [pathname]);

  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setExpanded(false);
        toggle.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rail.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [expanded]);

  return <aside ref={rail} className="admin-rail" data-expanded={expanded}>
    <Link href="/adpanel" className="admin-brand" aria-label="Обзор SmartBus">
      <img src="/home/brand/logo.svg" width="152" height="38" alt="SmartBus" />
    </Link>
    <button ref={toggle} className="admin-menu-button" type="button" aria-expanded={expanded}
      aria-controls="admin-navigation" onClick={() => setExpanded(open => !open)}>
      <Icon icon={expanded ? Close : Menu} size={20} aria-hidden="true" /> Разделы
    </button>
    <div className="admin-rail-body" id="admin-navigation" inert={compact && !expanded}>
      <div className="admin-rail-inner">
        <nav aria-label="Разделы панели" className="admin-nav">{groups.map(group =>
          <div className="admin-nav-group" key={group.label}>
            {group.label && <p>{group.label}</p>}
            {group.items.map(item =>
              <Link key={item.path} href={item.path ? "/adpanel/" + item.path : "/adpanel"} prefetch={false}
                onClick={() => setExpanded(false)} aria-current={section === item.path ? "page" : undefined}>
                <NavLabel item={item} />
              </Link>
            )}
          </div>
        )}</nav>
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">{login.slice(0, 1).toUpperCase()}</span>
          <span className="admin-account-name">{login}</span>
          <form action={signOut}><button type="submit" aria-label="Выйти из панели" title="Выйти из панели">
            <Icon icon={Logout} size={19} aria-hidden="true" />
          </button></form>
        </div>
      </div>
    </div>
  </aside>;
}

export function AdminToolbar() {
  const path=usePathname()?.split("/") || [];
  const section=all.find(item=>item.path===path[2]);
  const nested=!!path[3];
  return <header className="admin-toolbar"><nav aria-label="Путь в панели" className="admin-crumb">
    <Link href="/adpanel">Панель SmartBus</Link>
    <Icon icon={Right} aria-hidden="true" size={13}/>
    {section && nested ? <Link href={"/adpanel/"+section.path}>{section.title}</Link> : <span aria-current="page">{section?.title ?? "Обзор"}</span>}
    {nested && <><Icon icon={Right} aria-hidden="true" size={13}/><span aria-current="page">{path[3]==="new" ? "Создание" : "Редактор"}</span></>}
  </nav><Link className="admin-open-site" href="/" target="_blank" rel="noopener">Открыть сайт <Icon icon={Arrow} size={15} aria-hidden="true"/></Link></header>;
}
