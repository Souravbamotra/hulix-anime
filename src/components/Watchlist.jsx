"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getRawWatchlist,
  removeFromWatchlist,
  clearWatchlist,
  dispatchWatchlistChange,
} from "@/lib/watchlist";
import { timeAgo } from "@/lib/watchHistory";

export default function Watchlist() {
  const [list, setList] = useState([]);
  const [mounted, setMounted] = useState(false);

  const refresh = () => setList(getRawWatchlist());

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      refresh();
    }, 0);
    window.addEventListener("hulix_watchlist_changed", refresh);
    return () => window.removeEventListener("hulix_watchlist_changed", refresh);
  }, []);

  const handleRemove = (animeId) => {
    removeFromWatchlist(animeId);
    dispatchWatchlistChange();
    refresh();
  };

  const handleClearAll = () => {
    if (confirm("Clear your entire watchlist? This cannot be undone.")) {
      clearWatchlist();
      dispatchWatchlistChange();
      setList([]);
    }
  };

  if (!mounted) return null;

  return (
    <div className="watchlist-container main-container">
      {/* Header */}
      <div className="watchlist-header">
        <div>
          <h1 className="watchlist-title">My List</h1>
          <p className="watchlist-subtitle">
            {list.length === 0
              ? "Your watchlist is empty"
              : `${list.length} anime saved`}
          </p>
        </div>
        {list.length > 0 && (
          <button
            onClick={handleClearAll}
            className="glow-btn-secondary clear-history-btn"
          >
            Clear all
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="history-empty-state glass-panel">
          <p className="empty-state-icon">🔖</p>
          <p className="empty-state-title">Nothing saved yet</p>
          <p className="empty-state-desc">
            Hit the bookmark icon on any anime to save it here for later
          </p>
          <Link href="/" className="glow-btn browse-anime-btn">
            Browse Anime
          </Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {list.map((entry) => (
            <div key={entry.animeId} className="watchlist-card glass-card">
              {/* Cover */}
              <Link href={`/anime/${entry.animeId}`} className="watchlist-cover-link">
                <div className="watchlist-cover-wrapper">
                  {entry.coverImage ? (
                    <Image
                      src={entry.coverImage}
                      alt={entry.title}
                      fill
                      sizes="(max-width: 640px) 120px, 150px"
                      className="watchlist-cover-img"
                    />
                  ) : (
                    <div className="watchlist-cover-fallback">🎬</div>
                  )}
                  {entry.score && (
                    <div className="watchlist-score-badge">
                      ★ {(entry.score / 10).toFixed(1)}
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="watchlist-card-info">
                <Link href={`/anime/${entry.animeId}`} className="watchlist-card-title-link">
                  <h3 className="watchlist-card-title" title={entry.title}>
                    {entry.title}
                  </h3>
                </Link>
                <div className="watchlist-card-meta">
                  <span className="history-badge">{entry.format || "TV"}</span>
                  {entry.seasonYear && (
                    <span className="history-badge">{entry.seasonYear}</span>
                  )}
                </div>
                <p className="watchlist-card-added">
                  Added {timeAgo(entry.addedAt)}
                </p>
                <Link
                  href={`/anime/${entry.animeId}`}
                  className="glow-btn watchlist-watch-btn"
                >
                  Watch Now
                </Link>
              </div>

              {/* Remove */}
              <button
                onClick={() => handleRemove(entry.animeId)}
                className="history-remove-btn"
                title="Remove from My List"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
