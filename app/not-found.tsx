import type { Metadata } from "next";
import SystemState from "@/components/SystemState";

export const metadata: Metadata = {
  title: "Страница не найдена — SmartBus",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <SystemState kind="not-found" />;
}
