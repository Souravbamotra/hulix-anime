const HISTORY_KEY = 'anime_watch_history';
const MAX_ENTRIES = 100;

export function getRawWatchHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchEntry(entry) {
  try {
    const history = getRawWatchHistory();
    const filtered = history.filter(
      h => !(h.episodeId === entry.episodeId && h.language === entry.language)
    );
    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save watch history:', e);
  }
}

export function getWatchHistory() {
  const rawHistory = getRawWatchHistory();
  const seen = new Set();
  const deduplicated = [];
  
  for (const entry of rawHistory) {
    if (!seen.has(entry.animeId)) {
      seen.add(entry.animeId);
      deduplicated.push(entry);
    }
  }
  return deduplicated;
}

export function getContinueWatching(limit = 10) {
  return getWatchHistory()
    .filter(h => !h.completed && h.progress > 2)
    .slice(0, limit);
}

export function getEpisodeProgress(episodeId, language) {
  return getRawWatchHistory().find(
    h => h.episodeId === episodeId && h.language === language
  ) || null;
}

export function getAnimeHistory(animeId) {
  return getRawWatchHistory().filter(h => h.animeId === animeId);
}

export function isEpisodeCompleted(episodeId, language) {
  return getEpisodeProgress(episodeId, language)?.completed || false;
}

export function removeFromHistory(episodeId, language) {
  try {
    const history = getRawWatchHistory().filter(
      h => !(h.episodeId === episodeId && h.language === language)
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to remove from history:', e);
  }
}

export function clearWatchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
