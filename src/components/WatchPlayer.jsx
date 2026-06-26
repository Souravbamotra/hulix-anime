"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "./VideoPlayer";

export default function WatchPlayer({
  initialServers,
  episodeSlug,
  nextEpisodeSlug,
  animeId,
  malId,
  animeTitle,
  animeCover,
  episodeNumber,
  episodeTitle,
  language,
  episodeLength,
  episodes = [],
  fillerList = {}
}) {
  const router = useRouter();
  const [hideFillers, setHideFillers] = useState(false);

  useEffect(() => {
    const checkHideFillers = () => {
      setHideFillers(localStorage.getItem("hulix_hide_fillers") === "true");
    };
    checkHideFillers();
    window.addEventListener("hulix_hide_fillers_changed", checkHideFillers);
    return () => window.removeEventListener("hulix_hide_fillers_changed", checkHideFillers);
  }, []);

  const handleEpisodeEnded = () => {
    if (!animeId) return;

    let targetSlug = nextEpisodeSlug;

    if (hideFillers && episodes && episodes.length > 0 && fillerList && Object.keys(fillerList).length > 0) {
      const currentIdx = episodes.findIndex(ep => ep.slug === episodeSlug);
      if (currentIdx !== -1) {
        let nextIdx = currentIdx + 1;
        while (nextIdx < episodes.length) {
          const nextEp = episodes[nextIdx];
          const epNum = parseFloat(nextEp.number);
          const status = fillerList[epNum];
          if (status !== "filler") {
            targetSlug = nextEp.slug;
            break;
          }
          nextIdx++;
        }
        if (nextIdx >= episodes.length) {
          targetSlug = null;
        }
      }
    }

    if (targetSlug) {
      router.push(`/watch/${targetSlug}?animeId=${animeId}`);
    }
  };
  const [servers, setServers] = useState(initialServers || []);

  const is9anime = episodeSlug && !episodeSlug.startsWith("rareanimes-") && !episodeSlug.startsWith("anidap-") && !episodeSlug.startsWith("toonstream-");
  const isToonstream = episodeSlug && episodeSlug.startsWith("toonstream-");

  // Helper to check if a server's embed can be extracted to a direct stream
  const isServerExtractable = (server) => {
    if (!server) return false;
    const embedUrl = server.iframeUrl;
    if (!embedUrl) return false;
    return (
      embedUrl.includes("megaplay.su") ||
      embedUrl.includes("codedew.com") ||
      embedUrl.includes("razorshell.space") ||
      embedUrl.includes("streambeta") ||
      embedUrl.includes("multiquality") ||
      embedUrl.includes("anidap.se")
    );
  };

  // Compute initial category, server, and extraction state
  const initialCategory = useMemo(() => {
    const list = initialServers || [];
    if (list.length === 0) return "sub";
    const categoriesList = list.map(s => s.category || "sub");
    if (categoriesList.includes(language)) return language;
    return categoriesList[0] || "sub";
  }, [initialServers, language]);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(() => {
    return (initialServers || []).length === 0 && !!episodeSlug;
  });

  // Determine initial server and whether it is extracting
  const initialIsExtracting = useMemo(() => {
    if (is9anime || isToonstream) return false;
    const list = initialServers || [];
    const grouped = {};
    list.forEach((s) => {
      const cat = s.category || "sub";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    const currentSrvs = grouped[initialCategory] || [];
    const defaultServer = currentSrvs[0] || null;
    return defaultServer ? isServerExtractable(defaultServer) : false;
  }, [initialServers, initialCategory, is9anime, isToonstream]);

  const [directStream, setDirectStream] = useState(null);
  const [isExtracting, setIsExtracting] = useState(initialIsExtracting);
  const [playerMode, setPlayerMode] = useState(is9anime || isToonstream ? "iframe" : "auto"); // "auto" = try direct first, "iframe" = force iframe



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

  // Adjust activeCategory during render if current category is invalid
  if (categoryKeys.length > 0 && !categories[activeCategory]) {
    setActiveCategory(categoryKeys[0]);
  }

  const currentServers = categories[activeCategory] || [];
  const currentServer = currentServers[activeServerIndex] || currentServers[0] || null;
  const isAnidap = currentServer?.name === "AniDap" || (episodeSlug && episodeSlug.startsWith("anidap-"));

  const [prevCurrentServer, setPrevCurrentServer] = useState(currentServer);
  const [prevPlayerMode, setPrevPlayerMode] = useState(playerMode);

  if (currentServer !== prevCurrentServer || playerMode !== prevPlayerMode) {
    setPrevCurrentServer(currentServer);
    setPrevPlayerMode(playerMode);
    setDirectStream(null);
  }

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveServerIndex(0);
    setDirectStream(null); // Reset direct stream when switching
    
    // Check if the new default server for this category is extractable
    const newServers = categories[cat] || [];
    const newServer = newServers[0] || null;
    setIsExtracting(playerMode === "auto" && isServerExtractable(newServer));
  };

  const handleServerChange = (idx) => {
    setActiveServerIndex(idx);
    setDirectStream(null); // Reset direct stream when switching server
    
    // Check if the selected server is extractable
    const newServer = currentServers[idx] || null;
    setIsExtracting(playerMode === "auto" && isServerExtractable(newServer));
  };

  const handlePlayerModeChange = (mode) => {
    setPlayerMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("hulix-player-mode", mode);
    }
    setDirectStream(null);
    if (mode === "auto") {
      setIsExtracting(isServerExtractable(currentServer));
    } else {
      setIsExtracting(false);
    }
  };

  // Reset playerMode depending on the server type
  useEffect(() => {
    if (is9anime || isToonstream) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayerMode("iframe");
    } else {
      const saved = localStorage.getItem("hulix-player-mode") || "auto";
      setPlayerMode(saved);
    }
  }, [is9anime, isToonstream]);

  // Fetch servers dynamically if not provided at build time (SSR cache miss)
  useEffect(() => {
    if ((initialServers && initialServers.length > 0) || !episodeSlug) return;
    if (servers.length > 0) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    fetch(`/api/watch?episodeId=${encodeURIComponent(episodeSlug)}&servers=true`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.servers && data.servers.length > 0) {
          setServers(data.servers);
        }
      })
      .catch((err) => console.error("Failed to fetch servers:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [episodeSlug, initialServers, servers.length]);

  // Extract direct stream URL from embed when server changes
  useEffect(() => {
    if (!currentServer || playerMode === "iframe" || !isServerExtractable(currentServer)) {
      return;
    }

    const embedUrl = currentServer.iframeUrl;
    if (!embedUrl) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsExtracting(true);
    fetch(`/api/extract-stream?embedUrl=${encodeURIComponent(embedUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.directUrl) {
          setDirectStream(data);
        } else {
          setDirectStream(null);
          if (isAnidap) {
            setPlayerMode("iframe");
          }
        }
      })
      .catch(() => {
        setDirectStream(null);
        if (isAnidap) {
          setPlayerMode("iframe");
        }
      })
      .finally(() => setIsExtracting(false));
  }, [currentServer, playerMode, isAnidap]);

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
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
        </svg>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>No streaming source found</p>
        <p style={{ opacity: 0.7, fontSize: "0.85rem", marginBottom: 16 }}>
          The provider could not load servers for this episode. This usually resolves on retry.
        </p>
        <button
          className="glow-btn-secondary"
          style={{ fontSize: "0.85rem" }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
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
      ) : isAnidap && playerMode !== "iframe" && !directStream ? (
        <div className="player-error glass-panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="error-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Failed to extract stream for AniDap. Custom player stream is unavailable.</p>
        </div>
      ) : directStream && playerMode !== "iframe" ? (
        <VideoPlayer
          key={`${currentServer?.name || "Direct"}-${currentServer?.category || "sub"}-${directStream.directUrl}`}
          directUrl={directStream.directUrl}
          qualities={directStream.qualities}
          type={directStream.type}
          thumbnailUrl={directStream.thumbnailUrl}
          onEnded={handleEpisodeEnded}
          onStreamFailed={() => {
            console.warn("[WatchPlayer] HLS stream failed \u2014 falling back to iframe player");
            setPlayerMode("iframe");
            setDirectStream(null);
          }}
          nextEpisodeSlug={nextEpisodeSlug}
          animeId={animeId}
          malId={malId}
          animeTitle={animeTitle}
          animeCover={animeCover}
          episodeId={episodeSlug}
          episodeNumber={episodeNumber}
          episodeTitle={episodeTitle}
          language={language || activeCategory}
          episodeLength={episodeLength}
        />
      ) : (
        <VideoPlayer
          key={`${currentServer?.name || "Embed"}-${currentServer?.category || "sub"}-${currentServer?.iframeUrl || ""}`}
          src={currentServer?.iframeUrl}
          type={currentServer.sourceType}
          onEnded={handleEpisodeEnded}
          nextEpisodeSlug={nextEpisodeSlug}
          animeId={animeId}
          malId={malId}
          animeTitle={animeTitle}
          animeCover={animeCover}
          episodeId={episodeSlug}
          episodeNumber={episodeNumber}
          episodeTitle={episodeTitle}
          language={language || activeCategory}
          episodeLength={episodeLength}
        />
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
        {!is9anime && !isToonstream && (
          <div className="player-mode-toggle">
            <button
              className={`mode-btn ${playerMode !== "iframe" ? "active" : ""}`}
              onClick={() => handlePlayerModeChange("auto")}
              title="Custom Player — Ad-free with native controls"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9.5 7.5v9l7-4.5z"/>
              </svg>
              Custom Player
            </button>
            <button
              className={`mode-btn ${playerMode === "iframe" ? "active" : ""}`}
              onClick={() => handlePlayerModeChange("iframe")}
              title="Embedded Player — Original third-party player"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H5V8h14v10z"/>
              </svg>
              Embed Player
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
