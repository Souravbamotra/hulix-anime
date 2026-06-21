"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getWatchHistory,
  removeFromHistory,
  clearWatchHistory,
  formatTime,
  timeAgo
} from "@/lib/watchHistory";

export default function WatchHistory() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHistory(getWatchHistory());
  }, []);

  const handleRemove = (episodeId, language) => {
    removeFromHistory(episodeId, language);
    setHistory(getWatchHistory());
  };

  const handleClearAll = () => {
    if (confirm("Clear all watch history? This cannot be undone.")) {
      clearWatchHistory();
      setHistory([]);
    }
  };

  if (!mounted) return null;

  const filtered = history.filter(h => {
    if (filter === "in-progress") return !h.completed;
    if (filter === "completed") return h.completed;
    return true;
  });

  return (
    <div className="watch-history-container main-container">
      <div className="watch-history-header">
        <div className="watch-history-header-left">
          <h1 className="watch-history-title">Watch History</h1>
          <p className="watch-history-subtitle">{history.length} episodes watched</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="glow-btn-secondary clear-history-btn"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="watch-history-filters">
        {(["all", "in-progress", "completed"]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-tab-btn ${filter === f ? "active" : ""}`}
          >
            {f === "in-progress" ? "In progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="history-empty-state glass-panel">
          <p className="empty-state-icon">📭</p>
          <p className="empty-state-title">No history yet</p>
          <p className="empty-state-desc">Start watching anime and it will appear here</p>
          <Link
            href="/"
            className="glow-btn browse-anime-btn"
          >
            Browse Anime
          </Link>
        </div>
      ) : (
        <div className="watch-history-list">
          {filtered.map((entry) => (
            <div
              key={`${entry.episodeId}-${entry.language}`}
              className="watch-history-item glass-card group"
            >
              {/* Thumbnail */}
              <Link href={`/watch/${encodeURIComponent(entry.episodeId)}?animeId=${entry.animeId}`} className="history-thumbnail-link">
                <div className="history-thumbnail-wrapper">
                  {entry.animeCover ? (
                    <Image
                      src={entry.animeCover}
                      alt={entry.animeTitle}
                      fill
                      className="history-thumbnail-img"
                      sizes="144px"
                    />
                  ) : (
                    <div className="history-thumbnail-fallback">🎬</div>
                  )}
                  {/* Play overlay */}
                  <div className="history-play-overlay">
                    <span className="history-play-arrow">▶</span>
                  </div>
                </div>
              </Link>

              {/* Info Panel */}
              <div className="history-info-panel">
                <Link href={`/anime/${entry.animeId}`} className="history-anime-title-link">
                  <h3 className="history-anime-title" title={entry.animeTitle}>
                    {entry.animeTitle}
                  </h3>
                </Link>
                <p className="history-episode-label">Episode {entry.episodeNumber}</p>

                <div className="history-badges-row">
                  <span className="history-badge language-badge">
                    {entry.language}
                  </span>
                  {entry.completed ? (
                    <span className="history-badge completed-badge">
                      ✓ Completed
                    </span>
                  ) : entry.duration > 0 ? (
                    <span className="history-time-progress">
                      {formatTime(entry.timestamp)} / {formatTime(entry.duration)}
                    </span>
                  ) : (
                    <span className="history-time-progress">
                      In progress
                    </span>
                  )}
                  <span className="history-time-ago">{timeAgo(entry.watchedAt)}</span>
                </div>

                {/* Progress bar */}
                {!entry.completed && (
                  <div className="history-progress-container">
                    <div
                      className="history-progress-fill"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(entry.episodeId, entry.language)}
                className="history-remove-btn"
                title="Remove from history"
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
