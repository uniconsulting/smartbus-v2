"use client";

import { MaxChatLookup } from "./MaxChatLookup";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { useActionState, useRef, useState, type FormEvent } from "react";
import { useUnsavedNavigation } from "@/components/admin/useUnsavedNavigation";
import type { integrationSettings } from "@/lib/integrations";
import { checkMax, retryDelivery, saveBotSettings, type BotSaveResult } from "./actions";
type Settings = Awaited<ReturnType<typeof integrationSettings>>;
const tokenText = (origin: string) =>
  origin === "stored"
    ? "Токен сохранён. Оставьте поле пустым, чтобы сохранить его."
    : origin === "environment"
      ? "Токен задан на сервере. Новый токен заменит его для сайта."
      : "Введите токен бота.";
type BotDraft = Pick<Settings, "mode" | "maxChat" | "maxUser" | "telegramChat"> & {
  maxToken: string; telegramToken: string; clearMax: boolean; clearTelegram: boolean;
};

function editableSettings(source: Pick<Settings, "mode" | "maxChat" | "maxUser" | "telegramChat">): BotDraft {
  return { mode: source.mode, maxChat: source.maxChat.trim(), maxUser: source.maxUser.trim(),
    telegramChat: source.telegramChat.trim(), maxToken: "", telegramToken: "", clearMax: false, clearTelegram: false };
}

const deliveryOptions = [
  { value: "auto", label: "Автоматически (приоритет MAX)" }, { value: "max", label: "MAX" },
  { value: "telegram", label: "Telegram" }, { value: "local", label: "Только сохранить на сайте" },
];

export function BotSettings({ settings }: { settings: Settings }) {
  const [baseline, setBaseline] = useState(() => editableSettings(settings));
  const [draft, setDraft] = useState(baseline);
  const [revision, setRevision] = useState(settings.revision);
  const [notice, setNotice] = useState<BotSaveResult | null>(null);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const dirty = (Object.keys(draft) as (keyof BotDraft)[]).some(key => draft[key] !== baseline[key]);
  useUnsavedNavigation(dirty);

  function change(update: Partial<BotDraft>) {
    setDraft(previous => ({ ...previous, ...update }));
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !dirty) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    setNotice(null);
    try {
      const result = await saveBotSettings(data);
      setNotice(result);
      if (result.ok) {
        const saved = editableSettings(draft);
        setBaseline(saved);
        setDraft(saved);
        setRevision(result.revision);
      }
    } catch {
      setNotice({ ok: false, message: "Не удалось подтвердить сохранение. Проверьте соединение и повторите попытку." });
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} aria-busy={pending}>
      <input type="hidden" name="revision" value={revision} />
      <AdminSelect name="mode" label="Куда доставлять заявки" value={draft.mode}
        onValueChange={mode => change({ mode: mode as BotDraft["mode"] })} disabled={pending}
        hint="В автоматическом режиме заявки идут в MAX. Если токен MAX не задан — в Telegram." options={deliveryOptions}/>
      <div className="admin-grid">
        <section className="admin-card">
          <h2>MAX</h2>
          <label className="admin-field">
            Токен бота
            <input name="maxToken" value={draft.maxToken} readOnly={pending} onChange={event => change({ maxToken: event.target.value })} type="password" autoComplete="new-password" maxLength={512} />
            <small>{tokenText(settings.maxSecret)}</small>
          </label>
          {settings.maxSecret === "stored" && (
            <label>
              <input type="checkbox" name="clear-max" checked={draft.clearMax} disabled={pending}
                onChange={event => change({ clearMax: event.target.checked })} /> Удалить сохранённый токен
            </label>
          )}
          <label className="admin-field">
            ID группы или канала
            <input name="maxChat" type="text" value={draft.maxChat} readOnly={pending} onChange={event => change({ maxChat: event.target.value })} maxLength={20} />
          </label>
          <MaxChatLookup disabled={pending || Boolean(draft.maxToken) || draft.clearMax} onFound={id => change({ maxChat: id })} />
          <label className="admin-field">
            ID личного чата пользователя
            <input name="maxUser" type="text" value={draft.maxUser} readOnly={pending} onChange={event => change({ maxUser: event.target.value })} maxLength={19} />
          </label>
          <p className="admin-muted">
            Добавьте бота в группу и укажите её ID. Личный получатель используется, когда ID группы пуст.
          </p>
        </section>
        <section className="admin-card">
          <h2>Telegram</h2>
          <label className="admin-field">
            Токен бота
            <input name="telegramToken" value={draft.telegramToken} readOnly={pending} onChange={event => change({ telegramToken: event.target.value })} type="password" autoComplete="new-password" maxLength={512} />
            <small>{tokenText(settings.telegramSecret)}</small>
          </label>
          {settings.telegramSecret === "stored" && (
            <label>
              <input type="checkbox" name="clear-telegram" checked={draft.clearTelegram} disabled={pending}
                onChange={event => change({ clearTelegram: event.target.checked })} /> Удалить сохранённый токен
            </label>
          )}
          <label className="admin-field">
            ID чата
            <input name="telegramChat" value={draft.telegramChat} readOnly={pending} onChange={event => change({ telegramChat: event.target.value })} maxLength={34} />
          </label>
          <p className="admin-muted">
            Укажите числовой ID группы, личного диалога либо имя публичного канала с @. Боту нужно право
            писать в выбранный чат.
          </p>
        </section>
      </div>
      <button className="admin-primary" disabled={pending || !dirty}>
        {pending ? "Сохраняем…" : "Сохранить настройки"}
      </button>
      {notice && <p role={notice.ok ? "status" : "alert"} className="admin-notice">{notice.message}</p>}
    </form>
  );
}
export function RetryButton({ id, uncertain }: { id: string; uncertain: boolean }) {
  const [notice, action, pending] = useActionState(retryDelivery, "");
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {uncertain && (
        <label>
          <input type="checkbox" name="confirmed" required /> Проверил чат, сообщения нет
        </label>
      )}
      <button className="admin-secondary" disabled={pending}>
        {pending ? "Отправляем…" : "Отправить уведомление"}
      </button>
      <span role="status">{notice}</span>
    </form>
  );
}

export function CheckConnection() {
  const [message, action, pending] = useActionState(checkMax, "");
  return (
    <form className="admin-card admin-check-max" action={action}>
      <div><h2>Проверка MAX</h2><p>Проверяет доступ бота к беседе без отправки сообщения.</p></div>
      <button className="admin-secondary" disabled={pending}>
        {pending ? "Проверяем…" : "Проверить подключение MAX"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
