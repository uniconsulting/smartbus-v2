import { Bus, ChartLineUp, ClipboardText, MapTrifold, SteeringWheel } from "@phosphor-icons/react/dist/ssr";

export default function ArticleArt({ visual, large = false }: { visual: string; large?: boolean }) {
  const Icon = visual === "bus" ? Bus : visual === "route" ? MapTrifold : visual === "fleet" ? SteeringWheel : visual === "control" ? ChartLineUp : ClipboardText;
  return <div className={`article-art article-art--${visual} ${large ? "article-art--large" : ""}`} aria-hidden="true"><div className="article-art-orbit" /><Icon className="article-art-icon" size={large ? 150 : 112} weight="thin" /><span className="article-art-mark">SB</span></div>;
}
