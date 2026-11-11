"use client";

import { useState } from "react";
import styles from "./variable-font-hover-by-random-letter.module.css";

type Props = {
  label: string;
  className?: string;
  accentFrom?: string;
  staggerDuration?: number;
  fromFontVariationSettings?: string;
  toFontVariationSettings?: string;
};

function shuffledPositions(length: number) {
  const positions = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
  }
  return positions;
}

function groupWords(text: string) {
  // Keep non-breaking spaces inside each animated word group.
  return text.trim().split(/[ \t\r\n]+/);
}

export default function VariableFontHoverByRandomLetter({
  label,
  className = "",
  accentFrom,
  staggerDuration = 0.03,
  fromFontVariationSettings = "'wght' 400, 'slnt' 0",
  toFontVariationSettings = "'wght' 900, 'slnt' 0",
}: Props) {
  const [active, setActive] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const accentIndex = accentFrom ? label.indexOf(accentFrom) : -1;
  const lines = accentIndex > 0
    ? [label.slice(0, accentIndex).trim(), label.slice(accentIndex).trim()]
    : [label];
  const letterCount = Array.from(label).filter((letter) => !/\s/.test(letter)).length;
  let letterIndex = 0;

  function activate() {
    setOrder(shuffledPositions(letterCount));
    setActive(true);
  }

  return (
    <h1
      className={`${styles.title} ${className}`.trim()}
      aria-label={label}
      tabIndex={0}
      onPointerEnter={activate}
      onPointerLeave={() => setActive(false)}
      onFocus={activate}
      onBlur={() => setActive(false)}
    >
      <span aria-hidden="true">
        {lines.map((line, lineIndex) => (
          <span className={`${styles.line} ${lineIndex > 0 ? styles.accent : ""}`} key={line}>
            {groupWords(line).map((word, wordIndex) => (
              <span className={styles.word} key={`${word}-${wordIndex}`}>
                {Array.from(word).map((letter, index) => {
                  if (/\s/.test(letter)) return <span key={index}>{letter}</span>;
                  const position = letterIndex++;
                  return (
                    <span
                      className={styles.letter}
                      key={index}
                      style={{
                        fontVariationSettings: active ? toFontVariationSettings : fromFontVariationSettings,
                        transitionDelay: active ? `${(order[position] ?? position) * staggerDuration}s` : "0s",
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </span>
            )).reduce<React.ReactNode[]>((parts, word, index) => {
              if (index) parts.push(" ");
              parts.push(word);
              return parts;
            }, [])}
          </span>
        ))}
      </span>
    </h1>
  );
}
