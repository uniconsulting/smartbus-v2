import { HugeiconsIcon } from "@hugeicons/react";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { requireAdmin } from "@/lib/admin-auth";
import { getContactRecord } from "@/lib/cms-contacts";
import { ContactsForm } from "./ContactsForm";
import styles from "./contacts-form.module.css";

export default async function AdminContactsPage() {
  await requireAdmin();
  const { value, revision } = await getContactRecord();
  return <section className={styles.page}>
    <header className={styles.header}>
      <div>
        <h1>Контакты</h1>
        <p>После сохранения контакты обновятся на сайте.</p>
      </div>
      <a className="admin-secondary" href="/contacts" target="_blank" rel="noopener noreferrer">
        Открыть страницу контактов <HugeiconsIcon icon={ArrowUpRight01Icon} size={17} aria-hidden="true" />
        <span className="visually-hidden"> (в новой вкладке)</span>
      </a>
    </header>
    <ContactsForm initial={value} revision={revision} />
  </section>;
}
