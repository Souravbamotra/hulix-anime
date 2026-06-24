/**
 * Watchlist (My List) — localStorage persistence.
 * Mirrors the watchHistory.js pattern: plain JS, no React.
 *
 * Shape of a watchlist entry:
 *   {
 *     animeId:    number,    // AniList ID
 *     title:      string,    // display title (english ?? romaji)
 *     coverImage: string,    // URL
 *     format:     string,    // "TV" | "MOVIE" | …
 *     seasonYear: number | null,
 *     score:      number | null,  // AniList averageScore (0-100)
 *     addedAt:    string,    // ISO date
 *   }
 */

const WATCHLIST_KEY = "hulix_watchlist";

/** @returns {Array} Raw watchlist array */
export function getRawWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Add or update an entry. Safe to call multiple times. */
export function addToWatchlist(entry) {
  try {
    const list = getRawWatchlist().filter((e) => e.animeId !== entry.animeId);
    list.unshift({ ...entry, addedAt: new Date().toISOString() });
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to add to watchlist:", e);
  }
}

/** Remove by AniList ID. */
export function removeFromWatchlist(animeId) {
  try {
    const list = getRawWatchlist().filter((e) => e.animeId !== animeId);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to remove from watchlist:", e);
  }
}

/** Toggle: adds if absent, removes if present. Returns the new state (true = in list). */
export function toggleWatchlist(entry) {
  if (isInWatchlist(entry.animeId)) {
    removeFromWatchlist(entry.animeId);
    return false;
  } else {
    addToWatchlist(entry);
    return true;
  }
}

/** @returns {boolean} */
export function isInWatchlist(animeId) {
  return getRawWatchlist().some((e) => e.animeId === animeId);
}

/** Clear the entire list. */
export function clearWatchlist() {
  localStorage.removeItem(WATCHLIST_KEY);
}

/** Dispatch a custom event so any mounted WatchlistButton re-syncs. */
export function dispatchWatchlistChange() {
  window.dispatchEvent(new Event("hulix_watchlist_changed"));
}
