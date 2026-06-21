"use client";

import { useEffect, useState } from "react";
import { getEpisodeProgress } from "@/lib/watchHistory";

export default function EpisodeProgressBar({ episodeId, language }) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!episodeId || !language) return;
    const entry = getEpisodeProgress(episodeId, language);
    if (entry) {
      setProgress(entry.progress);
      setCompleted(entry.completed);
    } else {
      setProgress(0);
      setCompleted(false);
    }
  }, [episodeId, language]);

  if (progress === 0) return null;

  return (
    <div className="episode-progress-bar-container">
      <div
        className={`episode-progress-bar-fill ${completed ? "completed" : "in-progress"}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
