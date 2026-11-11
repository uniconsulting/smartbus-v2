import { requireAdmin } from "@/lib/admin-auth";
import { integrationSettings } from "@/lib/integrations";
import { deliveryFor, deliveryLabels } from "@/lib/integrations-delivery";
import { listReceipts } from "@/lib/analytics-store";
import { BotSettings, CheckConnection, RetryButton } from "./Forms";

export const dynamic = "force-dynamic";
export default async function IntegrationsPage() {
  await requireAdmin();
  const [settings, receipts] = await Promise.all([
    integrationSettings(),
    listReceipts(undefined, undefined, 100),
  ]);
  const rows = await Promise.all(
    receipts.map(async (r) => ({ receipt: r, delivery: await deliveryFor(r.id) })),
  );
  const max = settings.mode === "max" || (settings.mode === "auto" && settings.maxSecret !== "missing");
  const token = max ? settings.maxSecret : settings.telegramSecret;
  const target = max ? settings.maxChat || settings.maxUser : settings.telegramChat;
  const provider = max ? "MAX" : "Telegram";
  const status =
    settings.mode === "local"
      ? "Заявки сохраняются на сайте. Чтобы получать уведомления, выберите мессенджер."
      : token === "missing"
        ? "Доставка не настроена. Выберите мессенджер и укажите токен бота."
        : !target
          ? "Токен задан. Укажите получателя для " + provider + "."
          : "Получатель " + provider + " настроен: " + target + ". Результат отправки появится в журнале.";
  return (
    <section className="admin-section admin-integrations">
      <h1>Интеграции</h1>
      <p className="admin-notice">{status}</p>
      <BotSettings settings={settings} />
      <CheckConnection />
      <section className="admin-card">
        <h2>Доставка заявок</h2>
        {rows.length === 0 ? (
          <p>Полученных заявок пока нет.</p>
        ) : (
          <>
            <p className="admin-muted">
              Последние 100 заявок. После изменения получателя можно доставить сохранённую заявку.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Получена, МСК</th>
                    <th>Заявка</th>
                    <th>Доставка</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ receipt: r, delivery: d }) => (
                    <tr key={r.id}>
                      <td>{new Date(r.at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</td>
                      <td>{r.id.slice(0, 8)}</td>
                      <td>
                        {deliveryLabels[d.state]} {d.provider && " · " + d.provider.toUpperCase()}{" "}
                        {d.status && " · HTTP " + d.status}
                      </td>
                      <td>
                        {settings.mode !== "local" &&
                          token !== "missing" &&
                          !!target &&
                          d.state !== "sent" &&
                          d.state !== "sending" && (
                            <RetryButton id={r.id} uncertain={d.state === "uncertain"} />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
