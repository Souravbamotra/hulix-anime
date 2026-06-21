"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import EpisodeProgressBar from "./EpisodeProgressBar";

export default function EpisodesList({
  subEpisodes = [],
  engDubEpisodes = [],
  hindiDubEpisodes = [],
  // Legacy support: if old "dubEpisodes" is passed, treat as hindiDub
  dubEpisodes,
  animeId,
  currentEpisodeId = "",
  fillerList = {},
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
  const [hideFillers, setHideFillers] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("hulix_hide_fillers");
    if (saved === "true") {
      setHideFillers(true);
    }

    // Sync state if it changes from another component (like WatchPlayer)
    const handleSync = () => {
      setHideFillers(localStorage.getItem("hulix_hide_fillers") === "true");
    };
    window.addEventListener("hulix_hide_fillers_changed", handleSync);
    return () => window.removeEventListener("hulix_hide_fillers_changed", handleSync);
  }, []);

  const handleHideFillersToggle = (e) => {
    const newVal = e.target.checked;
    setHideFillers(newVal);
    localStorage.setItem("hulix_hide_fillers", newVal ? "true" : "false");
    window.dispatchEvent(new Event("hulix_hide_fillers_changed"));
  };

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

  const hasFillers = useMemo(() => {
    if (!fillerList || Object.keys(fillerList).length === 0) return false;
    return Object.values(fillerList).some(status => status === "filler");
  }, [fillerList]);

  const filteredEpisodes = useMemo(() => {
    if (!isMounted || !hideFillers || !hasFillers) {
      return episodes;
    }
    return episodes.filter(ep => {
      const epNum = parseFloat(ep.number);
      const status = fillerList[epNum];
      return status !== "filler";
    });
  }, [episodes, hideFillers, hasFillers, fillerList, isMounted]);

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

  const renderFillerToggle = () => {
    if (!isMounted || !hasFillers) return null;
    return (
      <div className="filler-toggle-wrapper">
        <label className="filler-switch-label">
          <input
            type="checkbox"
            checked={hideFillers}
            onChange={handleHideFillersToggle}
            className="filler-switch-input"
          />
          <span className="filler-switch-slider" />
          <span className="filler-switch-text">Hide Fillers</span>
        </label>
      </div>
    );
  };

  if (variant === "sidebar") {
    return (
      <div className="episodes-sidebar glass-panel">
        <div className="sidebar-header-flex">
          <h3 className="sidebar-title">Episodes</h3>
          {renderFillerToggle()}
        </div>
        
        {renderTabs()}

        <div className="sidebar-list">
          {filteredEpisodes.length > 0 ? (
            filteredEpisodes.map((ep) => {
              const isActive = ep.slug === currentEpisodeId;
              const resolvedLang = activeTab === "engDub" ? "dub" : (activeTab === "hindiDub" ? "hindi" : "sub");
              const epNum = parseFloat(ep.number);
              const status = fillerList[epNum];
              
              let statusClass = "";
              let statusLabel = "";
              if (status === "filler") {
                statusClass = "filler-badge-filler";
                statusLabel = "Filler";
              } else if (status === "mixed") {
                statusClass = "filler-badge-mixed";
                statusLabel = "Mixed";
              } else if (status === "anime_canon") {
                statusClass = "filler-badge-anime-canon";
                statusLabel = "Anime Canon";
              }

              return (
                <Link
                  key={ep.slug}
                  href={`/watch/${ep.slug}?animeId=${animeId}`}
                  className={`sidebar-item ${isActive ? "active" : ""} ${status ? `has-status ${status}` : ""}`}
                  style={{ position: "relative", overflow: "hidden" }}
                >
                  <div className="sidebar-ep-details">
                    <span className="sidebar-ep-num">EP {ep.number}</span>
                    {statusLabel && (
                      <span className={`filler-badge ${statusClass}`}>{statusLabel}</span>
                    )}
                  </div>
                  {isActive && <span className="playing-dot" />}
                  <EpisodeProgressBar episodeId={ep.slug} language={resolvedLang} />
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {renderFillerToggle()}
          {filteredEpisodes.length > 0 && (
            <span className="ep-count">{filteredEpisodes.length} Episodes available</span>
          )}
        </div>
      </div>

      {renderTabs()}

      {filteredEpisodes.length > 0 ? (
        <div className="episodes-grid">
          {filteredEpisodes.map((episode) => {
            const resolvedLang = activeTab === "engDub" ? "dub" : (activeTab === "hindiDub" ? "hindi" : "sub");
            const epNum = parseFloat(episode.number);
            const status = fillerList[epNum];
            
            let statusClass = "";
            let statusLabel = "";
            if (status === "filler") {
              statusClass = "filler-badge-filler";
              statusLabel = "Filler";
            } else if (status === "mixed") {
              statusClass = "filler-badge-mixed";
              statusLabel = "Mixed";
            } else if (status === "anime_canon") {
              statusClass = "filler-badge-anime-canon";
              statusLabel = "Anime Canon";
            }

            return (
              <Link
                key={episode.slug}
                href={`/watch/${episode.slug}?animeId=${animeId}`}
                className={`episode-btn ${status ? `has-status ${status}` : ""}`}
                style={{ position: "relative", overflow: "hidden" }}
              >
                <span className="ep-num-text">EP {episode.number}</span>
                {statusLabel && (
                  <span className={`filler-badge ${statusClass}`}>{statusLabel}</span>
                )}
                <EpisodeProgressBar episodeId={episode.slug} language={resolvedLang} />
              </Link>
            );
          })}
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
