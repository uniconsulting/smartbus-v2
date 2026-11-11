import { publicMetadata } from "@/lib/cms-seo";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ConsentMap from "@/components/ConsentMap";
import LeadRequestLink from "@/components/LeadRequestLink";
import { leadTasks } from "@/lib/lead-request";
import { getPublicContacts } from "@/lib/cms-contacts";
import { phoneHref } from "@/lib/public-contacts";
import styles from "./contacts.module.css";

export const generateMetadata = () => publicMetadata("contacts");

export default async function ContactsPage() {
  const contacts = await getPublicContacts();
  const emailChannels = [
    { label: "Общие вопросы", value: contacts.infoEmail, note: "Вопросы о компании и услугах" },
    { label: "Отдел продаж", value: contacts.email, note: "Расчёты и коммерческие предложения" },
    { label: "Канцелярия", value: contacts.officeEmail, note: "Документы и корреспонденция" },
  ];
  return (
    <div className="sb-home sb-inner-page" id="top">
      <SiteHeader />
      <main className="sb-inner-main">
        <section className={`sb-section ${styles.contacts}`} aria-labelledby="contacts-title">
          <div className="sb-heading">
            <h1 id="contacts-title">Контакты</h1>
            <p>Телефоны, почта и офис<br /> SmartBus в Москве</p>
          </div>
          <div className={styles.phoneGrid}>
            <section className={styles.phoneCard} aria-labelledby="office-phone-title">
              <div className={styles.cardHeading}><h2 id="office-phone-title">Офис</h2></div>
              <a className={styles.phoneNumber} href={phoneHref(contacts.phone)}>{contacts.phone}</a>
              <p className={styles.phoneNote}>По вопросам сотрудничества и перевозок</p>
              <div className={styles.cardBottom}>
                <LeadRequestLink task={leadTasks.team} className={styles.textLink}>
                  Обсудить маршрут
                  <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden="true" />
                </LeadRequestLink>
              </div>
            </section>
            <section className={styles.phoneCard} aria-labelledby="dispatch-phone-title">
              <div className={styles.cardHeading}>
                <h2 id="dispatch-phone-title">Диспетчерская</h2>
                <span className={styles.roundTheClock} aria-label="Круглосуточно">24/7</span>
              </div>
              <a className={styles.phoneNumber} href={phoneHref(contacts.dispatchPhone)}>{contacts.dispatchPhone}</a>
              <p className={styles.phoneNote}>По вопросам действующих рейсов</p>
              <div className={`${styles.cardBottom} ${styles.shortNumberRow}`}>
                <a className={styles.shortNumber} href={`tel:${contacts.shortPhone}`} aria-label={`Короткий номер диспетчерской службы ${contacts.shortPhone}`}>{contacts.shortPhone}</a>
                <div className={styles.shortNumberCopy}>
                  <span>Короткий номер диспетчерской службы</span>
                  <span>Быстрый звонок в SmartBus</span>
                </div>
              </div>
            </section>
          </div>
          <section className={styles.emailSection} aria-labelledby="emails-title">
            <h2 className={styles.groupTitle} id="emails-title">Электронная почта</h2>
            <ul className={styles.emailGrid}>
              {emailChannels.map(({ label, value, note }) => (
                <li key={label} className={styles.emailChannel}>
                  <h3>{label}</h3>
                  <a className={styles.emailValue} href={`mailto:${value}`}>{value}</a>
                  <p>{note}</p>
                </li>
              ))}
            </ul>
          </section>
        </section>
        <section className="sb-section" id="office" aria-labelledby="office-title">
          <div className="sb-heading">
            <h2 id="office-title">Наш офис</h2>
            <p>{contacts.officeBuilding}</p>
          </div>
          <div className={styles.officeFrame}>
            <div className={styles.addressStrip}>
              <address>{contacts.officeAddress}</address>
              <a className={styles.routeLink} href={contacts.mapUrl} target="_blank" rel="noopener noreferrer">
                <span>Маршрут до офиса</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden="true" />
                <span className="visually-hidden"> — открыть в Яндекс Картах</span>
              </a>
            </div>
            <div className={styles.mapViewport}><ConsentMap /></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
