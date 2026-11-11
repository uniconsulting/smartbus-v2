import { getPublicContacts } from "@/lib/cms-contacts";

export async function GET() {
  const contacts = await getPublicContacts();
  const text = `КАРТОЧКА КОМПАНИИ SMARTBUS

Полное наименование: ООО «СмартБас»
ИНН: 7729457334
ОГРН: 1157746344733
Юридический адрес: 125438, г. Москва, 4-й Лихачёвский пер., д. 4, стр. 4, пом. 313

Телефон офиса: ${contacts.phone}
Телефон диспетчерской: ${contacts.dispatchPhone}
Короткий номер: ${contacts.shortPhone}
E-mail: ${contacts.email}
Сайт: https://s-bus.ru/

Банковские реквизиты и копии официальных документов предоставляются по запросу.
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
