"use client";

import { useRef, useState } from "react";
import { beginMaxChatLookup, resolveMaxChatLookup } from "./actions";

export function MaxChatLookup({ disabled, onFound }: { disabled: boolean; onFound: (id: string) => void }) {
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(false);

  async function run(check: boolean) {
    if (active.current || disabled) return;
    active.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (check) {
        const result = await resolveMaxChatLookup(command);
        if ("id" in result) {
          onFound(result.id);
          setCommand("");
          setMessage("ID подставлен в поле выше. Проверьте его и сохраните настройки.");
        } else setMessage(result.error);
      } else {
        const result = await beginMaxChatLookup();
        if ("command" in result) setCommand(result.command);
        else setMessage(result.error);
      }
    } catch {
      setMessage("Проверка недоступна. Обновите страницу и повторите попытку.");
    } finally {
      setBusy(false);
      active.current = false;
    }
  }

  return <div className="admin-chat-lookup">
    {command ? <>
      <p>Добавьте в группу бота с сохранённым токеном и дайте ему права администратора на чтение и отправку сообщений. Скопируйте команду, отправьте её отдельным сообщением в эту группу и нажмите «Проверить сообщение». Команда действует пять минут.</p>
      <code>{command}</code>
      <div>
        <button type="button" className="admin-secondary" disabled={disabled || busy} onClick={() => run(true)}>
          {busy ? "Подождите…" : "Проверить сообщение"}
        </button>
        <button type="button" className="admin-lookup-link" disabled={disabled || busy} onClick={() => run(false)}>Получить новую команду</button>
      </div>
    </> : <button type="button" className="admin-lookup-link" disabled={disabled || busy} onClick={() => run(false)}>
      {busy ? "Готовим команду…" : "Узнать ID беседы"}
    </button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
