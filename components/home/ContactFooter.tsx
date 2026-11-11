"use client";

import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { useEffect, useRef, useState, type FormEvent } from "react";
import BrandFooter from "./BrandFooter";
import { LEAD_REQUEST_EVENT, mergeLeadTask } from "@/lib/lead-request";
import { contactHint, contactKind, contactLimit } from "@/lib/lead-contact";
import { currentVisit } from "@/lib/analytics-client";
import { newRequestId } from "@/lib/analytics-contract";
import { site } from "@/lib/site";
import "./contact-footer.css";

const questions = [
  {
    question: "Можно организовать развозку под сменный график?",
    answer: "Да. Укажите адреса, количество сотрудников и время начала смен. Мы предложим маршрут и подходящий класс транспорта.",
  },
  {
    question: "Работаете ли вы ночью и в выходные?",
    answer: "Такие рейсы можно включить в заявку. Доступность транспорта и условия подтвердим при расчёте конкретного маршрута.",
  },
  {
    question: "Что делать, если маршрут или число пассажиров изменятся?",
    answer: "Сообщите изменения менеджеру заранее. Мы подберём транспорт и пересчитаем стоимость до подтверждения обновлённого заказа.",
  },
  {
    question: "Как получить документы для закупки и бухгалтерии?",
    answer: "Запросите пакет через форму. Состав документов, НДС и сроки предоставления закрепляются в договоре.",
  },
  {
    question: "Как рассчитывается стоимость междугородней поездки?",
    answer: "Учитываем полный пробег, время работы, класс автобуса, платные дороги, парковки и возможный простой. Итог укажем в коммерческом предложении.",
  },
];

function Contact({ initialRevision }: { initialRevision: string | null }) {
  const [consentRevision, setConsentRevision] = useState(initialRevision);
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [task, setTask] = useState("");
  const lastPreset = useRef("");
  const inFlight = useRef(false);
  const submission = useRef({ id: "", payload: "" });
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!consent) return;
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, [consent]);

  useEffect(() => {
    function applyTask(next: unknown, scroll = false) {
      if (typeof next !== "string" || !next.trim() || inFlight.current) return;
      const previous = lastPreset.current;
      const preset = next.trim().slice(0, 1000);
      lastPreset.current = preset;
      setTask(current => mergeLeadTask(current, preset, previous));
      setStatus("idle");
      if (scroll) document.getElementById("contact")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
    function receiveInquiry(event: Event) { applyTask((event as CustomEvent<{ task?: string }>).detail?.task); }
    function receiveLead(event: Event) { applyTask((event as CustomEvent<string>).detail, true); }
    applyTask(new URLSearchParams(window.location.search).get("request"));
    window.addEventListener("smartbus:inquiry", receiveInquiry);
    window.addEventListener(LEAD_REQUEST_EVENT, receiveLead);
    return () => { window.removeEventListener("smartbus:inquiry", receiveInquiry); window.removeEventListener(LEAD_REQUEST_EVENT, receiveLead); };
  }, []);

  useEffect(() => {
    if (status === "success") resultRef.current?.focus({ preventScroll: true });
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !consent || !ready) return;

    const fields = new FormData(event.currentTarget);
    const contactInput = event.currentTarget.elements.namedItem("contact") as HTMLInputElement;
    if (!contactKind(contactInput.value)) {
      contactInput.setCustomValidity(contactHint);
      contactInput.reportValidity();
      return;
    }

    inFlight.current = true;
    setStatus("sending");
    setError("");
    try {
      const payload = { name: fields.get("name"), contact: contactInput.value.trim(), task, consent, consentRevision, company: fields.get("company") };
      const signature = JSON.stringify(payload);
      if (submission.current.payload !== signature) submission.current = { id: newRequestId(), payload: signature };
      const visit = currentVisit();
      const response = await fetch("/api/lead", {
        method: "POST",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload, requestId: submission.current.id, ...(visit && { analyticsConsent: true, visit }),
        }),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 409 && typeof result?.consentRevision === "string") {
        setConsentRevision(result.consentRevision);
        setConsent(false);
        setReady(false);
      }
      if (!response.ok || result?.ok !== true) {
        throw new Error(typeof result?.error === "string" ? result.error : "Не удалось отправить заявку. Попробуйте ещё раз.");
      }
      setTask("");
      submission.current = { id: "", payload: "" };
      lastPreset.current = "";
      setReady(false);
      setConsent(false);
      setStatus("success");
    } catch (failure) {
      setStatus("error");
      setError(failure instanceof TypeError ? "Нет связи с сервером. Проверьте соединение и попробуйте ещё раз." : failure instanceof Error ? failure.message : "Не удалось отправить заявку.");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section className="sb-section sb-contact" id="contact" aria-labelledby="sb-contact-title">
      <div className="sb-frame sb-contact-layout">
        <div className="sb-contact-photo" data-enter>
          <Image src="/home/images/contact.webp" alt="" fill quality={85} fetchPriority="low"
            sizes="(max-width: 999px) 96vw, (max-width: 1279px) 38vw, (min-width: 3840px) 1640px, 43vw" className="sb-contact-image" />
          <h2 id="sb-contact-title">Поехали?</h2>
          <p>Мы готовы стать Вашим <br />надёжным партнёром.</p>
        </div>

        {status === "success" ? (
          <div className="sb-contact-result" role="status">
            <HugeiconsIcon icon={Tick02Icon} aria-hidden="true" />
            <h3 ref={resultRef} tabIndex={-1}>Заявка отправлена</h3>
            <p>Свяжемся с вами по указанному контакту, чтобы обсудить поездку.</p>
            <button type="button" onClick={() => setStatus("idle")}>Отправить ещё одну</button>
          </div>
        ) : (
          <form className="sb-contact-form" data-enter="fade" onSubmit={submit} aria-label="Заявка на перевозку">
            <fieldset disabled={status === "sending"}>
              <div className="sb-contact-pair">
                <label>
                  <span>Ваше имя</span>
                  <input name="name" autoComplete="name" maxLength={100} placeholder="Как к Вам обращаться?" />
                </label>
                <label>
                  <span>Контакт*</span>
                  <input name="contact" type="text" autoComplete="off" spellCheck={false}
                    autoCapitalize="off" required maxLength={contactLimit} placeholder="Телефон/MAX/TG"
                    title={contactHint} onChange={(event) => event.currentTarget.setCustomValidity("")} />
                </label>
              </div>

              <label className="sb-contact-task">
                <span>Задача, маршрут или комментарий</span>
                <textarea name="task" rows={4} maxLength={1000} value={task}
                  onChange={(event) => setTask(event.target.value)} placeholder="Уточните то, что считаете важным" />
              </label>
              <input className="sb-contact-trap" aria-hidden="true" tabIndex={-1} name="company" autoComplete="off" />

              {status === "error" && <p className="sb-contact-error" role="alert">{error}</p>}
              <div className="sb-contact-consent" data-stage={consent ? (ready ? "ready" : "thanks") : "initial"}>
                <label className="sb-contact-checkbox">
                  <input type="checkbox" name="consent" required checked={consent}
                    aria-label={ready ? "Отозвать согласие на обработку персональных данных" : "Согласие на обработку персональных данных"}
                    onChange={(event) => { setReady(false); setConsent(event.target.checked); }} />
                  {ready
                    ? <span className="sb-contact-revoke">Отозвать согласие</span>
                    : <span className="sb-contact-checkmark" aria-hidden="true"><HugeiconsIcon icon={Tick02Icon} /></span>}
                </label>
                {!consent && (
                  <p>Отправляя заявку, вы принимаете <Link prefetch={false} href="/documents/privacy" target="_blank" rel="noopener">политику обработки персональных данных</Link> и даёте <Link prefetch={false} href="/documents/consent" target="_blank" rel="noopener">согласие на обработку персональных данных</Link>.</p>
                )}
                <span className={consent && !ready ? "sb-contact-thanks" : "visually-hidden"} role="status" aria-live="polite">
                  {consent && !ready ? "Спасибо!" : ready ? "Теперь можно отправить заявку." : ""}
                </span>
                {ready && consent && (
                  <button className="sb-contact-submit" type="submit" disabled={status === "sending"}>
                    <span>{status === "sending" ? "Отправляем…" : "Отправить заявку"}</span>
                    {status !== "sending" && <HugeiconsIcon icon={ArrowRight02Icon} aria-hidden="true" />}
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="sb-section sb-faq" id="faq" aria-labelledby="sb-faq-title">
      <div className="sb-faq-intro" data-enter>
        <h2 id="sb-faq-title">Частые <br />вопросы</h2>
        <a href="#contact">Задать свой вопрос <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" /></a>
      </div>
      <div className="sb-faq-list" data-enter-list>
        {questions.map((item, index) => (
          <div className="sb-faq-item" data-open={open === index} key={item.question}>
            <h3>
              <button type="button" aria-expanded={open === index} aria-controls={`sb-faq-answer-${index}`}
                onClick={() => setOpen(open === index ? null : index)}>
                {item.question}
                <span aria-hidden="true"><HugeiconsIcon icon={PlusSignIcon} /></span>
              </button>
            </h3>
            <div id={`sb-faq-answer-${index}`} className="sb-faq-answer" aria-hidden={open !== index}>
              <div><p>{item.answer}</p></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ContactFooter({ consentRevision }: { consentRevision: string | null }) {
  return <><Contact initialRevision={consentRevision} /><Faq /><BrandFooter /></>;
}
