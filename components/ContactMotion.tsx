"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function ContactMotion() {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-contact-hero-art]", { y: 35, scale: 0.9, opacity: 0.4 }, { y: 0, scale: 1, opacity: 1, duration: 1.1, ease: "power3.out" });
      gsap.fromTo("[data-contact-card]", { y: 50, opacity: 0.45 }, {
        y: 0,
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: { trigger: "[data-contact-card]", start: "top 90%", end: "top 56%", scrub: 1 },
      });
      gsap.fromTo("[data-map-frame]", { scale: 0.94, opacity: 0.55 }, {
        scale: 1,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: "[data-office-section]", start: "top 85%", end: "top 34%", scrub: 1 },
      });
    });
    return () => media.revert();
  }, []);

  return null;
}
