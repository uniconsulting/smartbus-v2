"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import HeartIcon from "@hugeicons/core-free-icons/HeartIcon";

export default function ArticleLikeButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [liked, setLiked] = useState(false);
  const storageKey = `smartbus:article-like:${slug}`;

  useEffect(() => {
    try {
      setLiked(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setLiked(false);
    }
  }, [storageKey]);

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // The visual state still works if browser storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className={`article-like ${compact ? "article-like--compact" : ""} ${liked ? "is-liked" : ""}`}
      onClick={toggleLike}
      aria-pressed={liked}
      aria-label={liked ? "Убрать отметку «Нравится»" : "Отметить статью как понравившуюся"}
      title={liked ? "Понравилось" : "Нравится"}
    >
      <HugeiconsIcon icon={HeartIcon} size={compact ? 22 : 21} fill={liked ? "currentColor" : "none"} aria-hidden="true" />
      {!compact && <span>{liked ? "Понравилось" : "Нравится"}</span>}
    </button>
  );
}
