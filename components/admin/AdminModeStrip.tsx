import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import "./admin-mode-strip.css";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "div" | "nav";
  activeIndex: number;
  count: number;
  children: ReactNode;
};

export function AdminModeStrip({ as: Element = "div", activeIndex, count, children, className = "", ...attributes }: Props) {
  const dimensions = { "--mode-count": count, "--mode-index": activeIndex } as CSSProperties;
  return <Element {...attributes} className={`admin-mode-strip ${className}`} style={dimensions}>{children}</Element>;
}
