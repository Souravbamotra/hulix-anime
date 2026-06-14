"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "./VideoPlayer";

export default function WatchPlayer({ initialServers, episodeSlug, nextEpisodeSlug, animeId }) {
  const router = useRouter();

  const handleEpisodeEnded = () => {
    if (nextEpisodeSlug && animeId) {
      router.push(`/watch/${nextEpisodeSlug}?animeId=${animeId}`);
    }
  };
  const [servers, setServers] = useState(initialServers || []);
  const [activeCategory, setActiveCategory] = useState("sub");
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Direct stream state (extracted from embed)
  const [directStream, setDirectStream] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [playerMode, setPlayerMode] = useState("auto"); // "auto" = try direct first, "iframe" = force iframe

  // Group servers by category (sub / dub)
  const categories = useMemo(() => {
    const grouped = {};
    servers.forEach((server) => {
      const cat = server.category || "sub";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(server);
    });
    return grouped;
  }, [servers]);

  const categoryKeys = useMemo(() => Object.keys(categories), [categories]);

  useEffect(() => {
    if (categoryKeys.length > 0 && !categories[activeCategory]) {
      setActiveCategory(categoryKeys[0]);
    }
  }, [categoryKeys, categories, activeCategory]);

  const currentServers = categories[activeCategory] || [];
  const currentServer = currentServers[activeServerIndex] || currentServers[0] || null;

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveServerIndex(0);
    setDirectStream(null); // Reset direct stream when switching
  };

  const handleServerChange = (idx) => {
    setActiveServerIndex(idx);
    setDirectStream(null); // Reset direct stream when switching server
  };

  // Fetch servers dynamically if not provided at build time
  useEffect(() => {
    if (servers.length === 0 && episodeSlug) {
      setIsLoading(true);
      fetch(`/api/watch?episodeId=${encodeURIComponent(episodeSlug)}&servers=true`)
        .then((res) => res.json())
        .then((data) => {
          if (data.servers && data.servers.length > 0) {
            setServers(data.servers);
          }
        })
        .catch((err) => console.error("Failed to fetch servers:", err))
        .finally(() => setIsLoading(false));
    }
  }, [episodeSlug, servers.length]);

  // Extract direct stream URL from embed when server changes
  useEffect(() => {
    if (!currentServer || playerMode === "iframe") {
      setDirectStream(null);
      return;
    }

    const embedUrl = currentServer.iframeUrl;
    if (!embedUrl) return;

    // Only try extraction for supported media extraction hosts (Gogo megaplay + RareAnimes hosts)
    if (
      embedUrl.includes("megaplay.su") ||
      embedUrl.includes("codedew.com") ||
      embedUrl.includes("razorshell.space") ||
      embedUrl.includes("streambeta") ||
      embedUrl.includes("multiquality")
    ) {
      setIsExtracting(true);
      fetch(`/api/extract-stream?embedUrl=${encodeURIComponent(embedUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.directUrl) {
            setDirectStream(data);
          } else {
            setDirectStream(null);
          }
        })
        .catch(() => setDirectStream(null))
        .finally(() => setIsExtracting(false));
    } else {
      setDirectStream(null);
    }
  }, [currentServer, playerMode]);

  if (isLoading) {
    return (
      <div className="player-placeholder glass-panel">
        <div className="placeholder-content">
          <div className="loading-spinner" />
          <p>Loading streaming servers...</p>
        </div>
      </div>
    );
  }

  if (!currentServer) {
    return (
      <div className="player-error glass-panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="error-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p>Streaming sources could not be loaded for this episode.</p>
      </div>
    );
  }

  return (
    <div className="watch-player-wrapper">
      {/* Video Player */}
      {isExtracting ? (
        <div className="player-placeholder glass-panel">
          <div className="placeholder-content">
            <div className="loading-spinner" />
            <p>Extracting stream...</p>
          </div>
        </div>
      ) : directStream && playerMode !== "iframe" ? (
        <VideoPlayer
          directUrl={directStream.directUrl}
          thumbnailUrl={directStream.thumbnailUrl}
          type={directStream.type}
          qualities={directStream.qualities}
          onEnded={handleEpisodeEnded}
        />
      ) : (
        <VideoPlayer src={currentServer.iframeUrl} type={currentServer.sourceType} onEnded={handleEpisodeEnded} />
      )}

      {/* Server Selector Panel */}
      <div className="server-selector glass-panel">
        {/* Sub / Dub Toggle */}
        {categoryKeys.length > 0 && (
          <div className="category-toggle">
            {categoryKeys.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => handleCategoryChange(cat)}
              >
                <span className="category-dot" />
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Server Buttons */}
        {currentServers.length > 1 && (
          <div className="server-list">
            <span className="server-label">Server:</span>
            {currentServers.map((server, idx) => (
              <button
                key={`${server.type}-${idx}`}
                className={`server-btn ${activeServerIndex === idx ? "active" : ""}`}
                onClick={() => handleServerChange(idx)}
              >
                {server.name}
              </button>
            ))}
          </div>
        )}

        {/* Player Mode Toggle */}
        <div className="player-mode-toggle">
          <button
            className={`mode-btn ${playerMode !== "iframe" ? "active" : ""}`}
            onClick={() => setPlayerMode("auto")}
            title="Custom Player — Ad-free with native controls"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9.5 7.5v9l7-4.5z"/>
            </svg>
            Custom Player
          </button>
          <button
            className={`mode-btn ${playerMode === "iframe" ? "active" : ""}`}
            onClick={() => setPlayerMode("iframe")}
            title="Embedded Player — Original third-party player"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H5V8h14v10z"/>
            </svg>
            Embed Player
          </button>
        </div>
      </div>
    </div>
  );
}
