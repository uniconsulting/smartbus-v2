"use client";

import { useId } from "react";
import { useDispatchPhone } from "@/components/ContactProvider";
import { phoneHref } from "@/lib/public-contacts";

export type SystemStateKind = "not-found" | "error" | "offline";

const content = {
  "not-found": {
    code: "Ошибка 404",
    title: "Страница не найдена",
    description: "Проверьте адрес в ссылке или перейдите на главную страницу SmartBus.",
  },
  error: {
    code: "Ошибка сайта",
    title: "Страница недоступна",
    description: "Попробуйте открыть страницу ещё раз. Если вам нужна помощь по рейсу, диспетчерская на связи круглосуточно.",
  },
  offline: {
    code: "Нет соединения",
    title: "Нет связи с сайтом",
    description: "Проверьте подключение к интернету. Если вопрос касается поездки, позвоните в круглосуточную диспетчерскую.",
  },
} as const;

const vehicles = ["coach", "citybus", "shuttle"];

export default function SystemState({ kind, httpStatus, onRetry, checking = false, status = "" }: {
  kind: SystemStateKind;
  httpStatus?: number;
  onRetry?: () => void;
  checking?: boolean;
  status?: string;
}) {
  const text = content[kind];
  const titleId = useId();
  const dispatchPhone = useDispatchPhone();
  const phone = phoneHref(dispatchPhone);

  return (
    <>
      <link rel="stylesheet" href="/system/state.css" precedence="default" />
      <main className="system-state" lang="ru" data-kind={kind} aria-labelledby={titleId}>
        <header className="state-header">
          <a href="/" aria-label="SmartBus — на главную">
            <img className="state-logo" src="/home/brand/logo.svg" width={230} height={57} alt="SmartBus" />
          </a>
          {kind !== "offline" && <p className="state-code">{httpStatus ? `Ошибка ${httpStatus}` : text.code}</p>}
        </header>

        <div className="state-content">
          <h1 className="state-title" id={titleId}>{text.title}</h1>
          <p className="state-description">{text.description}</p>
          <div className="state-actions">
            {kind === "not-found" && <a className="state-button state-button-primary" href="/">На главную</a>}
            {kind !== "not-found" && (
              <button type="button" className={`state-button${kind === "error" ? " state-button-primary" : ""}`}
                disabled={checking} onClick={onRetry ?? (() => window.location.reload())}>
                {checking ? "Проверяем связь…" : kind === "offline" ? "Проверить соединение" : "Попробовать снова"}
              </button>
            )}
            {kind === "offline" && <a className="state-button state-button-primary" href={phone}>Позвонить нам</a>}
            {kind === "error" && <a className="state-button" href="/">На главную</a>}
            {kind === "not-found" && <a className="state-button" href="/contacts">Контакты</a>}
          </div>
          {kind === "offline" && <p className="state-status" role="status" aria-live="polite">{status}</p>}
        </div>

        <footer className="state-footer">
          <div className="state-road" aria-hidden="true">
            {vehicles.map((vehicle) => (
              <span className="state-vehicle" data-vehicle={vehicle} key={vehicle}>
                <img src={`/home/footer/${vehicle}.svg`} alt="" />
              </span>
            ))}
          </div>
          <div className="state-dispatch">
            <span>Диспетчерская · 24/7</span>
            <a href={phone}>{dispatchPhone}</a>
          </div>
        </footer>
      </main>
    </>
  );
}
