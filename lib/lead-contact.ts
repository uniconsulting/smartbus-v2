export const contactLimit = 160;
export const contactHint = "Укажите номер телефона, @имя или ссылку на профиль в MAX или Telegram.";

export function contactKind(value: string): "phone" | "messenger" | null {
  const contact = value.trim();
  if (contact.length > contactLimit || /[\r\n]/.test(contact)) return null;

  if (/^\+?[\d()\s-]+$/.test(contact)) {
    const digits = contact.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15 ? "phone" : null;
  }

  if (/^@[a-z\d_]{2,}$/i.test(contact)) return "messenger";
  if (/^(?:https?:\/\/)?(?:t\.me|telegram\.me|(?:www\.)?max\.ru)\/[a-z\d_+-]+(?:\/[a-z\d_+-]+)*\/?(?:\?[^\s#]+)?$/i.test(contact)) return "messenger";
  return null;
}
