"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Call02Icon from "@hugeicons/core-free-icons/Call02Icon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { ContactField, PublicContacts } from "@/lib/public-contacts";
import { saveContactForm, type ContactSaveState } from "./actions";
import { useUnsavedNavigation } from "@/components/admin/useUnsavedNavigation";
import styles from "./contacts-form.module.css";

type Field = { name: ContactField; title: string; type: "text" | "tel" | "email" | "url"; limit: number };
const channels: { title: string; icon: typeof Call02Icon; fields: Field[] }[] = [
  { title: "Телефоны", icon: Call02Icon, fields: [
    { name: "phone", title: "Офис", type: "tel", limit: 40 },
    { name: "dispatchPhone", title: "Диспетчерская", type: "tel", limit: 40 },
    { name: "shortPhone", title: "Короткий номер диспетчерской", type: "tel", limit: 10 },
  ] },
  { title: "Электронная почта", icon: Mail01Icon, fields: [
    { name: "email", title: "Отдел продаж", type: "email", limit: 254 },
    { name: "infoEmail", title: "Общие вопросы", type: "email", limit: 254 },
    { name: "officeEmail", title: "Канцелярия", type: "email", limit: 254 },
  ] },
];
const addressFields: Field[] = [
  { name: "officeAddress", title: "Фактический адрес", type: "text", limit: 350 },
  { name: "officeBuilding", title: "Название здания", type: "text", limit: 350 },
];
const mapFields: Field[] = [
  { name: "mapUrl", title: "Ссылка на офис в Яндекс Картах", type: "url", limit: 2048 },
  { name: "mapConstructorEmbedUrl", title: "Ссылка для встроенной карты", type: "url", limit: 2048 },
];

export function ContactsForm({ initial, revision }: { initial: PublicContacts; revision: number }) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [notice, setNotice] = useState<ContactSaveState | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [_, action, pending] = useActionState(async (previous: ContactSaveState, submitted: FormData) => {
    const result = await saveContactForm(previous, submitted);
    if (result.ok) {
      const normalized = { ...saved };
      for (const name of Object.keys(normalized) as ContactField[]) {
        normalized[name] = String(submitted.get(name)).trim();
      }
      setSaved(normalized);
      setValues(normalized);
    }
    setNotice(result);
    return result;
  }, { revision, ok: false, message: "" });

  const count = (Object.keys(saved) as ContactField[]).filter(name => values[name] !== saved[name]).length;
  const dirty = count > 0;

  useUnsavedNavigation(dirty);

  useEffect(() => {
    if (!notice?.field) return;
    const input = form.current?.elements.namedItem(notice.field);
    if (input instanceof HTMLInputElement) {
      const details = input.closest("details");
      if (details) details.open = true;
      input.focus();
    }
  }, [notice]);

  function field({ name, title, type, limit }: Field) {
    const error = notice?.field === name ? notice.message : "";
    return <label key={name} className={styles.field} data-changed={values[name] !== saved[name] || undefined}>
      <span>{title}</span>
      <input name={name} type={type} maxLength={limit} value={values[name]} required readOnly={pending}
        aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "contact-field-error" : undefined}
        onChange={event => {
          const next = event.currentTarget.value;
          setValues(current => ({ ...current, [name]: next }));
          if (notice?.ok || notice?.field === name) setNotice(null);
        }} />
      {error && <small id="contact-field-error" role="alert">{error}</small>}
    </label>;
  }

  return <form ref={form} className={styles.form} action={action} onInvalidCapture={event => {
    const details = (event.target as HTMLElement).closest("details");
    if (details) details.open = true;
  }}>
    <div className={styles.channels}>
      {channels.map(group => <section className={styles.card} key={group.title}>
        <h2 className={styles.cardTitle}>
          <span className={styles.icon}><HugeiconsIcon icon={group.icon} size={21} aria-hidden="true" /></span>
          {group.title}
        </h2>
        <div className={styles.fields}>{group.fields.map(field)}</div>
      </section>)}
    </div>
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        <span className={styles.icon}><HugeiconsIcon icon={Location01Icon} size={21} aria-hidden="true" /></span>
        Офис и карта
      </h2>
      <div className={styles.address}>{addressFields.map(field)}</div>
      <details className={styles.maps}>
        <summary>
          <HugeiconsIcon icon={Link01Icon} size={18} aria-hidden="true" />
          <span>Ссылки Яндекс Карт</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} aria-hidden="true" />
        </summary>
        <div className={styles.fields}>{mapFields.map(field)}</div>
      </details>
    </section>
    <div className={styles.actions} data-active={dirty || undefined}>
      <div className={styles.state} data-dirty={dirty || undefined} aria-live="polite" aria-atomic="true">
        {!dirty && <HugeiconsIcon icon={Tick02Icon} size={18} aria-hidden="true" />}
        <span>{pending ? "Сохранение…" : notice && !notice.ok && !notice.field ? notice.message :
          dirty ? `Несохранённых изменений: ${count}` : notice?.ok ? notice.message : "Изменений нет"}</span>
      </div>
      <div className={styles.buttons}>
        {dirty && <button type="button" className={styles.undo} disabled={pending} onClick={() => {
          setValues(saved);
          setNotice(null);
        }}>Отменить изменения</button>}
        <button className="admin-primary" type="submit" disabled={!dirty || pending}>Сохранить контакты</button>
      </div>
    </div>
  </form>;
}
