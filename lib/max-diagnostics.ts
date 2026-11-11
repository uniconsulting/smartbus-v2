const dns = "Сервер сайта не смог определить IP-адрес API MAX. Попросите администратора проверить DNS на сервере.";
const timeout = "Время ожидания ответа API MAX истекло. Повторите проверку. Если ошибка повторится, попросите администратора проверить доступ сервера к API MAX.";
const reset = "Соединение с API MAX прервалось. Повторите проверку. Если соединение снова прервётся, попросите администратора проверить исходящие HTTPS-соединения сервера.";
const tls = "Не удалось установить защищённое соединение с API MAX. Попросите администратора проверить настройки TLS, доверенные сертификаты и время на сервере.";
const unreachable = "Сервер сайта не смог подключиться к API MAX. Попросите администратора проверить маршрут и доступ к порту 443.";

export function maxDiagnosticMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "MAX_AUTH":
        return "MAX отклонил токен. Проверьте сохранённый токен бота.";
      case "MAX_INTERFACE_UNAVAILABLE":
        return "Сетевой интерфейс для подключения к MAX недоступен. Попросите администратора проверить настройку SMARTBUS_MAX_INTERFACE на сервере.";
      case "MAX_UNAVAILABLE":
        return "API MAX вернул ошибку при запросе данных. Повторите проверку позже.";
      case "MAX_INVALID_RESPONSE":
      case "MAX_RESPONSE_LIMIT":
        return "Не удалось обработать ответ API MAX. Повторите проверку. Если ошибка повторится, обратитесь к администратору сайта.";
    }
    const code = (error as NodeJS.ErrnoException).code || "";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return dns;
    if (code === "ETIMEDOUT" || code === "ABORT_ERR" || error.name === "TimeoutError") return timeout;
    if (code === "ECONNRESET" || code === "EPIPE" || code === "ERR_STREAM_PREMATURE_CLOSE") return reset;
    if (/^(?:ERR_(?:TLS|SSL)_|CERT_|UNABLE_TO_(?:GET_ISSUER_CERT|VERIFY_LEAF_SIGNATURE)|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN)/.test(code)) return tls;
    if (code === "ECONNREFUSED" || code === "EHOSTUNREACH" || code === "ENETUNREACH") return unreachable;
  }
  return "Не удалось выполнить проверку MAX. Повторите попытку. Если ошибка повторится, обратитесь к администратору сайта.";
}
