import type { ReactNode } from "react";

export default function PanelTemplate({ children }: { children: ReactNode }) {
  return <div className="admin-page-enter">{children}</div>;
}
