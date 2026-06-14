"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

export default function EpisodesList({
  subEpisodes = [],
  engDubEpisodes = [],
  hindiDubEpisodes = [],
  // Legacy support: if old "dubEpisodes" is passed, treat as hindiDub
  dubEpisodes,
  animeId,
  currentEpisodeId = "",
  variant = "grid"
}) {
  // Backwards compatibility: if dubEpisodes is passed and hindiDubEpisodes is empty, use dubEpisodes
  const resolvedHindiDub = (hindiDubEpisodes && hindiDubEpisodes.length > 0) ? hindiDubEpisodes : (dubEpisodes || []);

  const hasSub = subEpisodes && subEpisodes.length > 0;
  const hasEngDub = engDubEpisodes && engDubEpisodes.length > 0;
  const hasHindiDub = resolvedHindiDub && resolvedHindiDub.length > 0;

  // Count how many tabs are available
  const tabCount = [hasSub, hasEngDub, hasHindiDub].filter(Boolean).length;
  const showTabs = tabCount > 1;

  // Build ordered list of available tabs
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (hasSub) tabs.push({ key: "sub", label: "Sub" });
    if (hasEngDub) tabs.push({ key: "engDub", label: "English Dub" });
    if (hasHindiDub) tabs.push({ key: "hindiDub", label: "Hindi Dub" });
    return tabs;
  }, [hasSub, hasEngDub, hasHindiDub]);

  const initialTab = useMemo(() => {
    if (currentEpisodeId) {
      // Hindi dub episodes from RareAnimes start with "rareanimes-"
      if (currentEpisodeId.startsWith("rareanimes-")) {
        return hasHindiDub ? "hindiDub" : "sub";
      }
      // Check if current episode is in engDub list
      if (hasEngDub && engDubEpisodes.some(ep => ep.slug === currentEpisodeId)) {
        return "engDub";
      }
    }
    // Default: first available tab
    if (hasSub) return "sub";
    if (hasEngDub) return "engDub";
    if (hasHindiDub) return "hindiDub";
    return "sub";
  }, [currentEpisodeId, hasSub, hasEngDub, hasHindiDub, engDubEpisodes]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const episodes = useMemo(() => {
    switch (activeTab) {
      case "engDub": return engDubEpisodes;
      case "hindiDub": return resolvedHindiDub;
      default: return subEpisodes;
    }
  }, [activeTab, subEpisodes, engDubEpisodes, resolvedHindiDub]);

  const renderTabs = () => {
    if (!showTabs) return null;
    return (
      <div className="episodes-tabs">
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-dot" />
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  if (variant === "sidebar") {
    return (
      <div className="episodes-sidebar glass-panel">
        <h3 className="sidebar-title">Episodes</h3>
        
        {renderTabs()}

        <div className="sidebar-list">
          {episodes.length > 0 ? (
            episodes.map((ep) => {
              const isActive = ep.slug === currentEpisodeId;
              return (
                <Link
                  key={ep.slug}
                  href={`/watch/${ep.slug}?animeId=${animeId}`}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-ep-num">EP {ep.number}</span>
                  <span className="sidebar-ep-label">Episode {ep.number}</span>
                  {isActive && <span className="playing-dot" />}
                </Link>
              );
            })
          ) : (
            <div style={{ padding: "1rem", textAlign: "center", opacity: 0.7 }}>
              No episodes found
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: grid variant
  return (
    <div className="episodes-section glass-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <h3 className="episodes-section-title" style={{ marginBottom: 0 }}>
          Watch Episodes
        </h3>
        {episodes.length > 0 && (
          <span className="ep-count">{episodes.length} Episodes available</span>
        )}
      </div>

      {renderTabs()}

      {episodes.length > 0 ? (
        <div className="episodes-grid">
          {episodes.map((episode) => (
            <Link
              key={episode.slug}
              href={`/watch/${episode.slug}?animeId=${animeId}`}
              className="episode-btn"
            >
              EP {episode.number}
            </Link>
          ))}
        </div>
      ) : (
        <div className="no-episodes">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p>No streams found for this title currently. Check back later!</p>
        </div>
      )}
    </div>
  );
}
