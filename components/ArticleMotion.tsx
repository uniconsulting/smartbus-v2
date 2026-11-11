"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function ArticleMotion() {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 621px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>(".article-card").forEach((tile) => {
        gsap.fromTo(tile, { y: 32, opacity: 0, scale: 0.97 }, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: tile, start: "top 92%", once: true },
        });
      });
    });
    return () => media.revert();
  }, []);

  return null;
}
