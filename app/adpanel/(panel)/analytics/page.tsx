import Form from "next/form";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { requireAdmin } from "@/lib/admin-auth";
import { readAnalyticsReport } from "@/lib/analytics-report";
import { pages } from "@/lib/analytics-contract";

export const dynamic = "force-dynamic";
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; source?: string }>;
}) {
  await requireAdmin();
  const report = await readAnalyticsReport(await searchParams);
  const sources = new Set(report.sources);
  // A saved URL can select a source with no visits in the current date range.
  if (report.source) sources.add(report.source);
  const sourceOptions = [
    { value: "", label: "Все источники" },
    ...Array.from(sources, value => ({ value, label: value === "unattributed" ? "Без атрибуции" : value })),
  ];
  const stats = [
    ["Посетители", report.visitors],
    ["Визиты", report.visits],
    ["Принятые заявки", report.leads],
    [
      "Конверсия визитов",
      report.visits ? Math.round((1000 * report.converted) / report.visits) / 10 + " %" : "—",
    ],
  ];
  return (
    <section className="admin-section">
      <header className="admin-heading"><h1>Аналитика</h1>
      <p className="admin-muted">
        Источник и UTM первого перехода в визите, страницы и действия до принятой сайтом заявки. Учёт визитов
        начинается после разрешения аналитики.
      </p></header>
      <Form key={JSON.stringify([report.from, report.to, report.source])} action="/adpanel/analytics" scroll={false} prefetch={false}
        className="admin-form admin-card admin-analytics-filter">
        <div className="admin-grid">
          <label className="admin-field">
            С даты
            <input type="date" name="from" defaultValue={report.from} required />
          </label>
          <label className="admin-field">
            По дату
            <input type="date" name="to" defaultValue={report.to} required />
          </label>
          <AdminSelect key={report.source} name="source" label="Источник" defaultValue={report.source} options={sourceOptions}/>
        </div>
        <button className="admin-primary">Применить</button>
      </Form>
      <div className="admin-stat-grid">
        {stats.map(([label, value]) => (
          <div className="admin-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {report.visits === 0 && report.leads === 0 ? (
        <p className="admin-notice">За выбранный период данных пока нет.</p>
      ) : (
        <>
          <section className="admin-card">
            <h2>Источники и кампании</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Источник</th>
                    <th>Канал / utm_medium</th>
                    <th>Кампания</th>
                    <th>Объявление / content</th>
                    <th>Метка / term</th>
                    <th>Визиты</th>
                    <th>Заявки</th>
                  </tr>
                </thead>
                <tbody>
                  {report.channels.map((r) => (
                    <tr key={[r.source, r.medium, r.campaign, r.content, r.term].join("/")}>
                      <td>{r.source}</td>
                      <td>{r.medium || "—"}</td>
                      <td>{r.campaign || "—"}</td>
                      <td>{r.content || "—"}</td>
                      <td>{r.term || "—"}</td>
                      <td>{r.sessions}</td>
                      <td>{r.leads}</td>
                    </tr>
                  ))}
                  {report.unattributed > 0 && (
                    <tr>
                      <td>Без атрибуции</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{report.unattributed}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <div className="admin-grid">
            <section className="admin-card">
              <h2>Просмотры страниц</h2>
              {report.pageViews.length ? (
                <ul>
                  {report.pageViews.map(([label, n]) => (
                    <li key={label}>
                      {label} · {n}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Пока нет просмотров.</p>
              )}
            </section>
            <section className="admin-card">
              <h2>Действия</h2>
              {report.actionCounts.length ? (
                <ul>
                  {report.actionCounts.map(([label, n]) => (
                    <li key={label}>
                      {label} · {n}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Пока нет действий.</p>
              )}
            </section>
          </div>
          <section className="admin-card">
            <h2>Динамика за период</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата, UTC</th>
                  <th>Визиты</th>
                  <th>Заявки</th>
                </tr>
              </thead>
              <tbody>
                {report.timeline.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.sessions}</td>
                    <td>{r.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {report.conversions.length > 0 && (
            <section className="admin-card">
              <h2>Путь до заявки</h2>
              <ul>
                {report.conversions.map((r) => (
                  <li key={r.id}>
                    <strong>
                      Заявка {r.id.slice(0, 8)} ·{" "}
                      {new Date(r.at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК
                    </strong>
                    <p>
                      {r.visit
                        ? [r.visit.source, r.visit.medium, r.visit.campaign, r.visit.content, r.visit.term]
                            .filter(Boolean)
                            .join(" / ") +
                          " → " +
                          (r.steps.join(" → ") || pages[r.visit.landing]) +
                          " → Заявка"
                        : "Заявка без атрибуции"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <p className="admin-muted">
        В конверсию входят визиты, закончившиеся сохранённой заявкой. Заявки без согласия на аналитику входят
        только в общее число. Статус уведомления доступен в интеграциях.
      </p>
    </section>
  );
}
