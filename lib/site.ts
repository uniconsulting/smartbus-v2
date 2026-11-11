export const site = {
  name: "SmartBus",
  phone: process.env.NEXT_PUBLIC_PHONE || "+7 (499) 390-81-79",
  dispatchPhone: "+7 (926) 800-55-71",
  shortPhone: "*7305",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL || "",
  whatsappUrl: process.env.NEXT_PUBLIC_WHATSAPP_URL || "",
  email: "sale@s-bus.ru",
  officeAddress: "127238, Москва, 3-й Нижнелихоборский проезд, 1Ас6, офис 108",
  officeBuilding: "Бизнес-центр Bloks",
  mapUrl: "https://yandex.ru/maps/org/smartbus/22699444018/?ll=37.559712%2C55.847872&z=16.69",
  mapConstructorEmbedUrl: "https://yandex.ru/map-widget/v1/?lang=ru_RU&scroll=true&source=constructor-api&um=constructor%3A0dfbbd564223dd4c8e931055fbf7ac1d7f95b380737ab2fae727d0db44c2ea8f",
  location: "Москва и Московская область",
  transportLabels: {
    minibus: "Микроавтобус",
    midi: "Средний автобус",
    coach: "Большой автобус",
  },
} as const;
