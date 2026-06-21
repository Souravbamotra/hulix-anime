"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getContinueWatching, removeFromHistory, formatTime, timeAgo } from "@/lib/watchHistory";

export default function ContinueWatching() {
  const [entries, setEntries] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setEntries(getContinueWatching(10));
  }, []);

  const handleRemove = (e, episodeId, language) => {
    e.preventDefault(); // Prevent navigating to the link when clicking the "x" button
    e.stopPropagation();
    removeFromHistory(episodeId, language);
    setEntries(getContinueWatching(10));
  };

  // Don't render on server (localStorage is client-only)
  if (!mounted || entries.length === 0) return null;

  return (
    <section className="home-section continue-watching-section">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Continue Watching</h2>
          <p className="section-subtitle">
            {entries.length} episode{entries.length > 1 ? "s" : ""} in progress
          </p>
        </div>
        <Link href="/history" className="glow-btn-secondary view-all-btn">
          View all →
        </Link>
      </div>

      <div className="continue-watching-row scrollbar-hide">
        {entries.map((entry) => (
          <div key={`${entry.episodeId}-${entry.language}`} className="continue-watching-card-wrapper group">
            <Link href={`/watch/${encodeURIComponent(entry.episodeId)}?animeId=${entry.animeId}`} className="continue-watching-card-link">
              <div className="continue-watching-card">
                <div className="card-thumbnail-wrapper">
                  {entry.animeCover ? (
                    <Image
                      src={entry.animeCover}
                      alt={entry.animeTitle}
                      fill
                      className="card-thumbnail-img"
                      sizes="224px"
                    />
                  ) : (
                    <div className="card-thumbnail-fallback">🎬</div>
                  )}

                  {/* Dark overlay with play icon */}
                  <div className="card-play-overlay">
                    <div className="play-icon-circle">
                      <span className="play-icon-arrow">▶</span>
                    </div>
                  </div>

                  {/* Time remaining badge */}
                  <div className="time-left-badge">
                    {entry.duration > 0
                      ? `${formatTime(entry.duration - entry.timestamp)} left`
                      : "In progress"}
                  </div>

                  {/* Language badge */}
                  <div className="language-badge">
                    {entry.language}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="card-progress-container">
                  <div
                    className="card-progress-bar-fill"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              </div>

              {/* Info row */}
              <div className="card-info-row">
                <div className="card-info-text">
                  <p className="card-anime-title" title={entry.animeTitle}>{entry.animeTitle}</p>
                  <p className="card-episode-info">
                    Ep {entry.episodeNumber} • {timeAgo(entry.watchedAt)}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, entry.episodeId, entry.language)}
                  className="card-remove-btn"
                  title="Remove from continue watching"
                >
                  ×
                </button>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
