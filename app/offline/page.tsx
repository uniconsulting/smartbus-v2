import type { Metadata } from "next";
import OfflineState from "@/components/OfflineState";

export const metadata: Metadata = {
  title: "Нет соединения — SmartBus",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineState />;
}
