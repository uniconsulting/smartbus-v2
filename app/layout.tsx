import type { Metadata } from "next";
import localFont from "next/font/local";
import PublicOverlays from "@/components/PublicOverlays";
import { ContactProvider } from "@/components/ContactProvider";
import { getPublicContacts } from "@/lib/cms-contacts";
import DocumentViewerProvider from "@/components/DocumentViewerProvider";
import "./globals.css";
import "./secondary.css";

const montserrat = localFont({
  src: [
    { path: "./fonts/Montserrat-Variable.ttf", weight: "100 900", style: "normal" },
    { path: "./fonts/Montserrat-Italic-Variable.ttf", weight: "100 900", style: "italic" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

const bicubik = localFont({
  src: "../design/fonts/Bicubik.woff2",
  variable: "--font-bicubik",
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
});
const garet = localFont({
  src: "../design/fonts/Garet-Variable-Web.woff2",
  variable: "--font-garet",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  title: "SmartBus — корпоративные перевозки в Москве и Московской области",
  description:
    "Перевозка сотрудников, корпоративные трансферы и аренда автобусов в Москве и Московской области. Более 200 регулярных маршрутов. Рассчитайте поездку и оставьте заявку.",
  openGraph: {
    title: "SmartBus — корпоративные перевозки",
    description: "Логистика людей, которая работает по вашему графику.",
    type: "website",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href="/system/state.css" precedence="default" />
      </head>
      <body className={`${montserrat.variable} ${bicubik.variable} ${garet.variable}`}>
        <ContactProvider contacts={await getPublicContacts()}><DocumentViewerProvider>{children}<PublicOverlays /></DocumentViewerProvider></ContactProvider>
      </body>
    </html>
  );
}
