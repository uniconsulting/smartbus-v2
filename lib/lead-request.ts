export const LEAD_REQUEST_EVENT = "smartbus:lead-request";

export const leadTasks = {
  general: "Организация пассажирской перевозки",
  team: "Организация перевозки команды",
  complex: "Разработка сложного маршрута перевозки",
  documents: "Запрос документов и условий сотрудничества",
  contract: "Запрос договорных условий перевозки",
  trip: "Запрос информации о рейсе и назначенном транспорте",
  accounting: "Запрос документов для бухгалтерии и условий ЭДО",
  licenses: "Запрос лицензии и допусков для сотрудничества",
  proposal: "Запрос договора и коммерческого предложения на перевозку",
  coverage: "Регулярная перевозка по Москве и Московской области",
  question: "Вопрос об организации пассажирской перевозки",
} as const;

export function leadRequestHref(task: string) {
  return `/?request=${encodeURIComponent(task)}#contact`;
}

// Replace only the previous automatic reason; keep the visitor's own details.
export function mergeLeadTask(current: string, task: string, previous: string) {
  if (current === task || current.startsWith(`${task}\n`)) return current;
  let details = current;
  if (previous && current === previous) details = "";
  else if (previous && current.startsWith(`${previous}\n`)) details = current.slice(previous.length).replace(/^\n+/, "");
  const merged = details.trim() ? `${task}\n\n${details}` : task;
  // Automatic context must never displace the visitor's own details at the API limit.
  return merged.length <= 1000 ? merged : current;
}
