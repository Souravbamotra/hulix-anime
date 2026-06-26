"use client";

import { useState, useEffect } from "react";
import {
  isInWatchlist,
  toggleWatchlist,
  dispatchWatchlistChange,
} from "@/lib/watchlist";

/**
 * Animated bookmark/heart toggle button for the watchlist.
 *
 * Props:
 *   animeId    {number}  — required
 *   title      {string}
 *   coverImage {string}  — cover URL
 *   format     {string}
 *   seasonYear {number|null}
 *   score      {number|null}  — AniList 0-100 score
 *   variant    {"icon"|"pill"}  — "icon" = compact icon-only, "pill" = full labeled button
 */
export default function WatchlistButton({
  animeId,
  title,
  coverImage,
  format,
  seasonYear,
  score,
  variant = "pill",
}) {
  const [inList, setInList] = useState(false);
  const [popping, setPopping] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      setInList(isInWatchlist(animeId));
    }, 0);

    const sync = () => setInList(isInWatchlist(animeId));
    window.addEventListener("hulix_watchlist_changed", sync);
    return () => window.removeEventListener("hulix_watchlist_changed", sync);
  }, [animeId]);

  if (!mounted) {
    // Render a placeholder of the same size to avoid layout shift
    return (
      <button
        className={`watchlist-btn watchlist-btn--${variant} watchlist-btn--placeholder`}
        aria-hidden="true"
        disabled
      >
        {variant === "pill" ? (
          <>
            <BookmarkIcon filled={false} />
            My List
          </>
        ) : (
          <BookmarkIcon filled={false} />
        )}
      </button>
    );
  }

  const handleClick = () => {
    const entry = { animeId, title, coverImage, format, seasonYear, score };
    const nowInList = toggleWatchlist(entry);
    setInList(nowInList);
    dispatchWatchlistChange();

    // Trigger pop animation on add
    if (nowInList) {
      setPopping(true);
      setTimeout(() => setPopping(false), 400);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={[
        "watchlist-btn",
        `watchlist-btn--${variant}`,
        inList ? "watchlist-btn--active" : "",
        popping ? "watchlist-btn--pop" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={inList ? "Remove from My List" : "Add to My List"}
      aria-pressed={inList}
      title={inList ? "Remove from My List" : "Add to My List"}
    >
      <BookmarkIcon filled={inList} />
      {variant === "pill" && (
        <span>{inList ? "In My List" : "My List"}</span>
      )}
    </button>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="watchlist-icon"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
