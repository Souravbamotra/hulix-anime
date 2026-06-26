"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Hls from "hls.js";
import {
  saveWatchEntry,
  getEpisodeProgress,
  formatTime
} from "@/lib/watchHistory";

export default function VideoPlayer({
  src,
  type = "iframe",
  directUrl,
  thumbnailUrl,
  qualities,
  onEnded,
  onStreamFailed,
  nextEpisodeSlug,
  // Watch history props:
  animeId,
  malId,
  animeTitle,
  animeCover,
  episodeId,
  episodeNumber,
  episodeTitle,
  language,
  episodeLength
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const progressTimerRef = useRef(null);
  const iframeRef = useRef(null);

  // Hard-stop video on unmount (iframe cleanup is handled by React via key-based remount)
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      try {
        if (video) {
          video.pause();
          video.src = "";
          video.load();
        }
      } catch (e) {
        console.warn("Failed to clean up video element:", e);
      }
    };
  }, []);

  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Watch history states
  const [resumeInfo, setResumeInfo] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Auto Next state
  const [autoNext, setAutoNext] = useState(true);

  // AniSkip state (Hindi dub only)
  const [skipTimes, setSkipTimes]   = useState(null); // { intro?: {start,end}, outro?: {start,end} }
  const [activeSkip, setActiveSkip] = useState(null); // 'intro' | 'outro' | null
  const [prevEpisodeId, setPrevEpisodeId] = useState(episodeId);
  const hasPrefetchedRef = useRef(false);
  const [isStopped, setIsStopped] = useState(false);
  const pathname = usePathname();
  const [initialPathname, setInitialPathname] = useState(pathname);

  if (episodeId !== prevEpisodeId) {
    setPrevEpisodeId(episodeId);
    setSkipTimes(null);
    setActiveSkip(null);
    setIsStopped(false);
    setInitialPathname(pathname);
  }

  useEffect(() => {
    hasPrefetchedRef.current = false;
  }, [episodeId]);

  // Reset isStopped when the iframe src changes (episode navigation)
  const isFirstSrcRender = useRef(true);
  useEffect(() => {
    if (isFirstSrcRender.current) {
      isFirstSrcRender.current = false;
      return;
    }
    if (src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsStopped(false);
    }
  }, [src]);

  useEffect(() => {
    if (pathname !== initialPathname && !pathname.startsWith("/watch/")) {
      setTimeout(() => {
        setIsStopped(true);
      }, 0);
    }
  }, [pathname, initialPathname]);

  useEffect(() => {
    if (isStopped) {
      const video = videoRef.current;
      try {
        if (video) {
          video.pause();
          video.src = "";
          video.load();
        }
      } catch (e) {
        console.warn("Failed to pause video on stop:", e);
      }
      // Note: iframe cleanup is handled declaratively via React's conditional
      // rendering (src={isStopped ? "about:blank" : src}) — no direct DOM
      // mutation needed. Direct mutation caused state mismatch where React
      // wouldn't re-set the src when isStopped toggled back to false.
    }
  }, [isStopped]);

  // Sync autoNext state with localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hulix-auto-next");
      if (saved !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAutoNext(saved === "true");
      }
    }
  }, []);

  // Stop player on navigation
  useEffect(() => {
    const handleNavigationStart = (href) => {
      if (!href) return;
      try {
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = new URL(href, window.location.origin);
        if (
          targetUrl.origin === window.location.origin &&
          targetUrl.pathname + targetUrl.search !== currentUrl &&
          !targetUrl.pathname.startsWith("/watch/")
        ) {
          setIsStopped(true);
        }
      } catch (err) {
        if (
          href.startsWith("/") &&
          href !== window.location.pathname + window.location.search &&
          !href.startsWith("/watch/")
        ) {
          setIsStopped(true);
        }
      }
    };

    const handleGlobalClick = (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");

      if (e.metaKey || e.ctrlKey || e.shiftKey || (target && target === "_blank")) {
        return;
      }

      if (href) {
        handleNavigationStart(href);
      }
    };

    const handlePopState = () => {
      // Only stop if navigating away from a watch page
      if (!window.location.pathname.startsWith("/watch/")) {
        setIsStopped(true);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Fetch skip timestamps from our backend API proxy (combining Anime-Skip and AniSkip REST)
  useEffect(() => {
    if (!animeId && !malId) return;
    if (!episodeNumber) return;
    if (skipTimes) return; // Already fetched successfully

    const length = duration > 0 ? Math.round(duration) : (episodeLength || 1440);

    fetch(
      `/api/skip-times?animeId=${animeId || ""}&malId=${malId || ""}&episodeNumber=${episodeNumber}&episodeLength=${length}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch skip times");
        return res.json();
      })
      .then((data) => {
        if (!data.found) return;

        // Calculate offset if duration and data.episodeLength are available
        const dbLength = data.episodeLength;
        const playerLength = duration > 0 ? duration : (episodeLength || 1440);
        
        let offset = 0;
        if (dbLength && playerLength) {
          offset = playerLength - dbLength;
        }

        const finalTimes = { ...data };
        // We only apply the offset if it is within a reasonable range (e.g. between -180s and +180s)
        // to avoid incorrect adjustments from wild mismatches
        if (Math.abs(offset) > 2 && Math.abs(offset) < 180) {
          console.log(`[VideoPlayer] Applying timeline offset of ${offset.toFixed(1)}s (Player: ${playerLength.toFixed(1)}s, DB: ${dbLength.toFixed(1)}s)`);
          if (finalTimes.intro) {
            finalTimes.intro.start = Math.max(0, finalTimes.intro.start + offset);
            finalTimes.intro.end = Math.max(0, finalTimes.intro.end + offset);
          }
          if (finalTimes.outro) {
            finalTimes.outro.start = Math.max(0, finalTimes.outro.start + offset);
            finalTimes.outro.end = Math.max(0, finalTimes.outro.end + offset);
          }
        }
        setSkipTimes(finalTimes);
      })
      .catch((err) => {
        console.warn("[VideoPlayer] Failed to load skip timestamps:", err.message);
      });
  }, [animeId, malId, episodeNumber, language, duration, episodeLength, skipTimes]);

  // Reset skip times when episode changes is now handled during render above

  const handleAutoNextToggle = () => {
    const newVal = !autoNext;
    setAutoNext(newVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("hulix-auto-next", newVal.toString());
    }
  };

  const onEndedRef = useRef(onEnded);
  const autoNextRef = useRef(autoNext);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    autoNextRef.current = autoNext;
  }, [autoNext]);

  // Quality states
  const [availableQualities, setAvailableQualities] = useState(qualities || []);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto for HLS
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Refs for auto-hide state sync (declared after state initialization)
  const isPlayingRef = useRef(isPlaying);
  const showQualityMenuRef = useRef(showQualityMenu);
  const isHoveringControlsRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    showQualityMenuRef.current = showQualityMenu;
  }, [showQualityMenu]);

  // Determine if we should use native video (direct URL available)
  const useNativePlayer = Boolean(directUrl);
  const isHls = type === "hls" || directUrl?.includes(".m3u8");

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || video.duration === Infinity) return;
    const progress = Math.round((video.currentTime / video.duration) * 100);
    
    // Guard against missing metadata
    if (!animeId || !episodeId) return;

    saveWatchEntry({
      animeId,
      animeTitle: animeTitle || "Unknown Anime",
      animeCover: animeCover || "",
      episodeId,
      episodeNumber: episodeNumber || 1,
      episodeTitle: episodeTitle || "Episode 1",
      language: language || "sub",
      timestamp: Math.floor(video.currentTime),
      duration: Math.floor(video.duration),
      progress,
      completed: progress > 85,
      watchedAt: new Date().toISOString(),
    });
  }, [animeId, animeTitle, animeCover, episodeId, episodeNumber, episodeTitle, language]);

  // Stable refs so event listeners (attached once) always call the latest version
  // without needing to be torn down and re-added every time these values change.
  const saveProgressRef = useRef(saveProgress);
  const skipTimesRef = useRef(skipTimes);

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => {
    skipTimesRef.current = skipTimes;
  }, [skipTimes]);

  // Check for saved progress on mount
  useEffect(() => {
    if (!episodeId || !language) return;
    const saved = getEpisodeProgress(episodeId, language);
    if (saved && saved.timestamp > 10 && !saved.completed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResumeInfo(saved);
      setShowResumePrompt(true);
    } else {
      setShowResumePrompt(false);
      setResumeInfo(null);
    }
  }, [episodeId, language]);

  // Handle baseline save for iframe players (since progress cannot be tracked in third-party iframes)
  useEffect(() => {
    if (useNativePlayer || !src) return;

    if (animeId && episodeId) {
      const existing = getEpisodeProgress(episodeId, language);
      if (!existing) {
        saveWatchEntry({
          animeId,
          animeTitle: animeTitle || "Unknown Anime",
          animeCover: animeCover || "",
          episodeId,
          episodeNumber: episodeNumber || 1,
          episodeTitle: episodeTitle || "Episode 1",
          language: language || "sub",
          timestamp: 0,
          duration: 0,
          progress: 10, // 10% progress baseline so it registers as in-progress and shows in rows/detail grids
          completed: false,
          watchedAt: new Date().toISOString(),
        });
      }
    }
  }, [useNativePlayer, src, animeId, episodeId, animeTitle, animeCover, episodeNumber, episodeTitle, language]);

  // --- HLS Setup ---
  useEffect(() => {
    if (!useNativePlayer || !isHls) return;
    const video = videoRef.current;
    if (!video || !directUrl) return;

    // Synchronously check if resume prompt will be shown to determine autoplay
    const saved = getEpisodeProgress(episodeId, language);
    const hasResume = saved && saved.timestamp > 10 && !saved.completed;

    if (Hls.isSupported()) {
      let retryCount = 0;
      const MAX_RETRIES = 2;
      let manifestLoaded = false;

      // Safety timeout: if the manifest hasn't loaded in 12s, the stream is dead.
      // Fire onStreamFailed so WatchPlayer can fall back to iframe mode.
      const manifestTimeout = setTimeout(() => {
        if (!manifestLoaded) {
          console.warn("[HLS] Manifest load timeout — stream unreachable, triggering fallback");
          hlsRef.current?.destroy();
          hlsRef.current = null;
          onStreamFailed?.();
        }
      }, 12000);

      const createHls = () => {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1024 * 1024, // 60MB max buffer capacity
          enableWorker: true,
          lowLatencyMode: false,  // must be false for proxied VOD streams — true causes aggressive prefetch that stalls
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,
        });
        hlsRef.current = hls;
        hls.loadSource(directUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          manifestLoaded = true;
          clearTimeout(manifestTimeout);

          // Extract quality levels from HLS manifest
          const levels = data.levels.map((level, idx) => ({
            url: "",
            label: `${level.height}p`,
            height: level.height,
            index: idx,
          }));

          const nextQualities = [{ label: "Auto", index: -1 }, ...levels];
          setAvailableQualities(nextQualities);

          // Retrieve preferred quality
          let preferred = "Auto";
          if (typeof window !== "undefined") {
            preferred = localStorage.getItem("hulix-preferred-quality") || "Auto";
          }

          const matchedLevel = nextQualities.find((q) => q.label === preferred);
          if (matchedLevel) {
            hls.currentLevel = matchedLevel.index;
            setCurrentQuality(matchedLevel.index);
          } else {
            hls.currentLevel = -1;
            setCurrentQuality(-1);
          }

          if (!hasResume) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          console.warn(`[HLS] Fatal error type=${data.type} retryCount=${retryCount}`);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            // Destroy current instance and recreate — more reliable than just startLoad()
            hls.destroy();
            hlsRef.current = null;
            setTimeout(() => {
              if (videoRef.current) createHls();
            }, 1500 * retryCount);
          } else {
            clearTimeout(manifestTimeout);
            // All retries exhausted — fall back to iframe
            hls.destroy();
            hlsRef.current = null;
            if (!manifestLoaded) {
              onStreamFailed?.();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // Media error after manifest loaded — try soft recovery
              hls.recoverMediaError();
            }
          }
        });

        return hls;
      };

      const hls = createHls();

      return () => {
        clearTimeout(manifestTimeout);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = directUrl;
      if (!hasResume) {
        video.play().catch(() => {});
      }
    }
  }, [directUrl, isHls, useNativePlayer, episodeId, language, onStreamFailed]);

  // --- Direct MP4 Setup ---
  useEffect(() => {
    if (!useNativePlayer || isHls) return;
    const video = videoRef.current;
    if (!video || !directUrl) return;
    video.src = directUrl;

    const saved = getEpisodeProgress(episodeId, language);
    const hasResume = saved && saved.timestamp > 10 && !saved.completed;

    if (!hasResume) {
      video.play().catch(() => {});
    }
  }, [directUrl, isHls, useNativePlayer, episodeId, language]);

  // --- Video Event Listeners ---
  // Listeners are attached ONCE (dep: useNativePlayer only) and read latest
  // saveProgress / skipTimes / autoNext / onEnded via stable refs to avoid
  // tearing down and re-adding all listeners every time those values change.
  useEffect(() => {
    if (!useNativePlayer) return;
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = setInterval(() => saveProgressRef.current?.(), 5000);
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      saveProgressRef.current?.();
    };
    const handleLoadedMeta = () => setDuration(video.duration);
    const handleTimeUpdate = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }

      // If the player is currently seeking, do not check/update skip segments to avoid flicker
      if (video?.seeking) return;
      // Prefetch next episode if progress > 85%
      if (nextEpisodeSlug && video.duration > 0 && (t / video.duration) > 0.85 && !hasPrefetchedRef.current) {
        hasPrefetchedRef.current = true;
        console.log(`[VideoPlayer] Prefetching next episode stream data: ${nextEpisodeSlug}`);
        fetch(`/api/watch?episodeId=${encodeURIComponent(nextEpisodeSlug)}&servers=true`).catch(() => {});
      }
      // Update active skip button via ref (avoids re-attaching listener when skipTimes loads)
      const st = skipTimesRef.current;
      if (st) {
        const { intro, outro } = st;
        if (intro && t >= intro.start && t < intro.end) {
          setActiveSkip("intro");
        } else if (outro && t >= outro.start && t < outro.end) {
          setActiveSkip("outro");
        } else {
          setActiveSkip(null);
        }
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      saveProgressRef.current?.();
      if (autoNextRef.current && onEndedRef.current) {
        setIsStopped(true);
        onEndedRef.current();
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handleLoadedMeta);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ended", handleEnded);

    return () => {
      saveProgressRef.current?.();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handleLoadedMeta);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("ended", handleEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNativePlayer]);

  const resetTimer = useCallback(() => {
    setShowControls(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (isPlayingRef.current && !showQualityMenuRef.current && !isHoveringControlsRef.current) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // --- Controls auto-hide ---
  useEffect(() => {
    if (!useNativePlayer) return;

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", resetTimer);
      container.addEventListener("touchstart", resetTimer);
      container.addEventListener("click", resetTimer);
    }
    
    // Start the auto-hide timer on mount
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isPlayingRef.current && !showQualityMenuRef.current && !isHoveringControlsRef.current) {
        setShowControls(false);
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (container) {
        container.removeEventListener("mousemove", resetTimer);
        container.removeEventListener("touchstart", resetTimer);
        container.removeEventListener("click", resetTimer);
      }
    };
  }, [useNativePlayer, resetTimer]);

  // --- Fullscreen change listener ---
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // --- Player Controls ---
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const handleSeek = useCallback((e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  }, [duration]);

  const handleVolumeChange = useCallback((e) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleQualityChange = useCallback((qualityIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityIndex;
      setCurrentQuality(qualityIndex);

      // Save preferred quality label to localStorage
      const found = availableQualities.find((q) => q.index === qualityIndex);
      if (found) {
        localStorage.setItem("hulix-preferred-quality", found.label);
      }
    }
    setShowQualityMenu(false);
  }, [availableQualities]);

  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (video) video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
  }, [duration]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    if (!useNativePlayer) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          resetTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          resetTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          resetTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          const newVolUp = Math.min(video.volume + 0.1, 1);
          video.volume = newVolUp;
          setVolume(newVolUp);
          setIsMuted(newVolUp === 0);
          resetTimer();
          break;
        case "ArrowDown":
          e.preventDefault();
          const newVolDown = Math.max(video.volume - 0.1, 0);
          video.volume = newVolDown;
          setVolume(newVolDown);
          setIsMuted(newVolDown === 0);
          resetTimer();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          resetTimer();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [useNativePlayer, togglePlay, skip, toggleFullscreen, toggleMute, resetTimer]);

  // Resume from saved timestamp
  const handleResume = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current && resumeInfo) {
      const video = videoRef.current;
      const targetTime = resumeInfo.timestamp;

      const performSeekAndPlay = () => {
        if (video.readyState >= 3) {
          video.currentTime = targetTime;
          video.play().catch((err) => console.warn("Play failed after seeking:", err));
        } else {
          try {
            video.currentTime = targetTime;
          } catch (err) {}
          const onCanPlay = () => {
            if (Math.abs(video.currentTime - targetTime) > 2) {
              video.currentTime = targetTime;
            }
            video.play().catch((err) => console.warn("Play failed on canplay:", err));
            video.removeEventListener("canplay", onCanPlay);
          };
          video.addEventListener("canplay", onCanPlay);
          video.play().catch(() => {});
        }
      };

      performSeekAndPlay();
    }
    setShowResumePrompt(false);
  };

  // Start from beginning
  const handleStartOver = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const video = videoRef.current;
      const performSeekAndPlay = () => {
        if (video.readyState >= 3) {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          try {
            video.currentTime = 0;
          } catch (err) {}
          const onCanPlay = () => {
            video.currentTime = 0;
            video.play().catch(() => {});
            video.removeEventListener("canplay", onCanPlay);
          };
          video.addEventListener("canplay", onCanPlay);
          video.play().catch(() => {});
        }
      };
      performSeekAndPlay();
    }
    setShowResumePrompt(false);
  };

  // Helper formatting function
  const helperFormatTime = (t) => {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- RENDER: No source or stopped ---
  if (isStopped || (!src && !directUrl)) {
    return (
      <div className="player-placeholder glass-panel">
        <div className="placeholder-content">
          <svg className="play-icon animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{isStopped ? "Loading episode..." : "Select an episode to start streaming"}</p>
        </div>
      </div>
    );
  }

  // --- RENDER: Native Custom Player (MP4 / HLS) ---
  if (useNativePlayer) {
    return (
      <div
        ref={containerRef}
        className={`video-player-container glass-panel custom-player ${showControls ? "show-controls" : ""}`}
        onClick={(e) => {
          if (e.target === videoRef.current || e.target.classList.contains("custom-player-overlay")) {
            togglePlay();
          }
        }}
      >
        <video
          ref={videoRef}
          className="native-video-element"
          playsInline
          crossOrigin="anonymous"
          poster={thumbnailUrl}
        />

        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className="custom-player-overlay loading-overlay">
            <div className="player-spinner" />
          </div>
        )}

        {/* Big Play Button (when paused) */}
        {!isPlaying && !isLoading && !showResumePrompt && (
          <div className="custom-player-overlay play-overlay" onClick={togglePlay}>
            <button className="big-play-btn" aria-label="Play">
              <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* Resume prompt overlay */}
        {showResumePrompt && resumeInfo && (
          <div className="resume-prompt-overlay">
            <div className="resume-prompt-modal">
              <p className="resume-prompt-title">Continue watching?</p>
              <p className="resume-prompt-time">
                You stopped at <span className="logo-highlight">{formatTime(resumeInfo.timestamp)}</span>
              </p>
              <div className="resume-actions-container">
                <button
                  onClick={(e) => handleStartOver(e)}
                  className="glow-btn-secondary resume-btn-startover"
                >
                  Start over
                </button>
                <button
                  onClick={(e) => handleResume(e)}
                  className="glow-btn resume-btn-resume"
                >
                  Resume
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Skip Intro / Skip Outro (from AniSkip) ── */}
        {activeSkip === "intro" && skipTimes?.intro && (
          <button
            className="skip-segment-btn"
            onClick={(e) => {
              e.stopPropagation();
              const video = videoRef.current;
              if (video) video.currentTime = skipTimes.intro.end;
              setActiveSkip(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
            Skip Intro
          </button>
        )}
        {activeSkip === "outro" && skipTimes?.outro && (
          <button
            className="skip-segment-btn"
            onClick={(e) => {
              e.stopPropagation();
              const video = videoRef.current;
              if (video) video.currentTime = skipTimes.outro.end;
              setActiveSkip(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
            Skip Outro
          </button>
        )}

        {/* Bottom Controls Bar */}
        <div
          className={`custom-controls ${showControls ? "visible" : ""}`}
          onMouseEnter={() => {
            isHoveringControlsRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveringControlsRef.current = false;
            resetTimer();
          }}
        >
          {/* Progress Bar */}
          <div className="progress-bar-container" onClick={handleSeek}>
            <div className="progress-bar-bg">
              <div className="progress-bar-buffered" style={{ width: `${(buffered / (duration || 1)) * 100}%` }} />
              <div className="progress-bar-fill" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
            </div>
          </div>

          <div className="controls-row">
            {/* Left Controls */}
            <div className="controls-left">
              <button className="ctrl-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip Backward */}
              <button className="ctrl-btn" onClick={() => skip(-10)} aria-label="Rewind 10s" title="-10s">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12.5 3C7.81 3 4 6.81 4 11.5h-3l4 4 4-4H6c0-3.58 2.92-6.5 6.5-6.5S19 7.92 19 11.5 16.08 18 12.5 18v2c4.69 0 8.5-3.81 8.5-8.5S17.19 3 12.5 3z" />
                </svg>
              </button>

              {/* Skip Forward */}
              <button className="ctrl-btn" onClick={() => skip(10)} aria-label="Forward 10s" title="+10s">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M11.5 3C16.19 3 20 6.81 20 11.5h3l-4 4-4-4h3c0-3.58-2.92-6.5-6.5-6.5S5 7.92 5 11.5 7.92 18 11.5 18v2C6.81 20 3 16.19 3 11.5S6.81 3 11.5 3z" />
                </svg>
              </button>

              {/* Volume */}
              <button className="ctrl-btn" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>

              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
              />

              <span className="time-display">
                {helperFormatTime(currentTime)} / {helperFormatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="controls-right">
              {/* Quality Selector */}
              {availableQualities.length > 0 && (
                <div className="quality-selector-wrapper">
                  <button
                    className="ctrl-btn quality-btn"
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    aria-label="Quality"
                    title="Quality"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" />
                    </svg>
                    <span className="quality-label">
                      {currentQuality === -1
                        ? "Auto"
                        : availableQualities.find((q) => q.index === currentQuality)?.label || "HD"}
                    </span>
                  </button>

                  {showQualityMenu && (
                    <div className="quality-menu glass-panel">
                      <div className="quality-menu-title">Quality</div>
                      {availableQualities.map((q) => (
                        <button
                          key={q.index ?? q.label}
                          className={`quality-option ${(q.index ?? q.label) === currentQuality ? "active" : ""}`}
                          onClick={() => handleQualityChange(q.index ?? q.label)}
                        >
                          {q.label}
                          {(q.index ?? q.label) === currentQuality && <span className="quality-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Auto Next Toggle */}
              <button
                className={`ctrl-btn auto-next-toggle-btn ${autoNext ? "active" : ""}`}
                onClick={handleAutoNextToggle}
                title="Toggle Auto Next Episode"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ marginRight: "4px" }}>
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
                <span className="auto-next-label-text" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                  {autoNext ? "Auto Next: ON" : "Auto Next: OFF"}
                </span>
              </button>

              {/* Fullscreen */}
              <button className="ctrl-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute the effective iframe src — memoised to use as key
  const effectiveIframeSrc = isStopped ? "about:blank" : src;

  // Safety net: after mount / src change, explicitly assign src to the iframe
  // via the ref. This covers edge cases where React's `setAttribute("src", ...)`
  // during reconciliation doesn't trigger the browser to navigate the iframe
  // (observed during Next.js client-side RSC transitions).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && effectiveIframeSrc && effectiveIframeSrc !== "about:blank") {
      // Only force-assign if the DOM src doesn't already match
      if (iframe.src !== effectiveIframeSrc) {
        iframe.src = effectiveIframeSrc;
      }
    }
  }, [effectiveIframeSrc]);

  // --- RENDER: Iframe fallback ---
  return (
    <div className="video-player-container glass-panel" style={{ position: 'relative' }}>
      {isStopped && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Stopping playback...</p>
          </div>
        </div>
      )}
      <div className="iframe-wrapper">
        <iframe
          key={effectiveIframeSrc}
          ref={iframeRef}
          src={effectiveIframeSrc}
          className="player-iframe"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          scrolling="no"
        />
      </div>
    </div>
  );
}
