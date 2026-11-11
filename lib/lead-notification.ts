import type { AcceptedLead } from "./analytics-store";

const moscowTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function leadNotification(lead: AcceptedLead, html: boolean): { text: string; format?: "html" } {
  const value = html ? escapeText : (s: string) => s;
  const bold = (s: string) => html ? `<b>${s}</b>` : s;
  const italic = (s: string) => html ? `<i>${s}</i>` : s;
  const field = (label: string, content: string) => content ? `${bold(label)} ${value(content)}` : "";
  const date = new Date(lead.createdAt);
  const time = Number.isFinite(date.getTime()) ? moscowTime.format(date) + " МСК" : value(lead.createdAt);
  const quote = html ? `<blockquote>${value(lead.task || "")}</blockquote>` : lead.task;
  const sections = [
    bold("Новая заявка SmartBus") + "\n" + italic(time),
    [field("Имя:", lead.name), field("Контакт:", lead.contact || lead.phone)].filter(Boolean).join("\n"),
    [field("Маршрут:", lead.route), field("Пассажиры:", lead.passengers)].filter(Boolean).join("\n"),
    lead.task && bold("Комментарий") + "\n" + quote,
  ];
  const text = sections.filter(Boolean).join("\n\n");
  // Escaping a comment full of HTML delimiters can exceed MAX's 4,000-character input limit.
  if (html && text.length > 4000) return leadNotification(lead, false);
  return html ? { text, format: "html" } : { text };
}
