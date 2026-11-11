"use client";
import { usePathname } from "next/navigation";
import CookieConsent from "./CookieConsent";
import SiteAvailability from "./SiteAvailability";
import SiteAnalytics from "./SiteAnalytics";

export default function PublicOverlays() {
  const path = usePathname();
  if (!path || path === "/adpanel" || path.startsWith("/adpanel/")) return null;
  return <><CookieConsent /><SiteAvailability /><SiteAnalytics /></>;
}
