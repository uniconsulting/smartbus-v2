"use client";

import { useEffect, useState } from "react";
import { COOKIE_CHOICE_EVENT, getCookieChoice, type CookieChoice } from "@/lib/cookie-consent";
import { usePublicContacts } from "@/components/ContactProvider";
import styles from "@/app/contacts/contacts.module.css";

export default function ConsentMap() {
  const contacts = usePublicContacts();
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setShowMap(getCookieChoice() === "all");
    const onChoice = (event: Event) => {
      const allowed = (event as CustomEvent<CookieChoice>).detail === "all";
      setShowMap(allowed);
      if (!allowed) setMapLoaded(false);
    };
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
  }, []);

  if (!showMap) {
    return <div className={styles.mapConsent}>
      <strong>Карта офиса</strong>
      <p>Для просмотра загрузим Яндекс.Карты. Сервис может использовать собственные cookie и технические данные.</p>
      <button type="button" onClick={() => setShowMap(true)}>Показать карту</button>
    </div>;
  }

  return <>
    <iframe
      className={styles.constructorMap}
      title="Офис SmartBus на Яндекс Картах"
      src={contacts.mapConstructorEmbedUrl}
      loading="lazy"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setMapLoaded(true)}
    />
    {!mapLoaded && <div className={styles.mapLoading} role="status">Загружаем карту…</div>}
  </>;
}
