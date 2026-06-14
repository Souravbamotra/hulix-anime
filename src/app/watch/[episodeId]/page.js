import { Suspense, cache } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import WatchPlayer from "@/components/WatchPlayer";
import EpisodesList from "@/components/EpisodesList";
import { getAnimeDetails } from "@/lib/anilist";
import { findGogoAnimeSlug, getAnimeEpisodes, getEpisodeServers, findRareAnimesSlug, getRareAnimesEpisodes } from "@/lib/scraper";

export const revalidate = 0; // Dynamic streaming page, do not cache

const getEpisodesCached = cache(async (romaji, english, format) => {
  try {
    const [gogoSubSlug, gogoDubSlug, rareSlug] = await Promise.all([
      findGogoAnimeSlug(romaji, english, format, false),
      findGogoAnimeSlug(romaji, english, format, true),
      findRareAnimesSlug(romaji, english, format)
    ]);
    
    const [gogoSubEpisodes, gogoDubEpisodes, rareEpisodes] = await Promise.all([
      gogoSubSlug ? getAnimeEpisodes(gogoSubSlug) : Promise.resolve([]),
      gogoDubSlug ? getAnimeEpisodes(gogoDubSlug) : Promise.resolve([]),
      rareSlug ? getRareAnimesEpisodes(rareSlug) : Promise.resolve([])
    ]);
    
    return {
      sub: gogoSubEpisodes,
      engDub: gogoDubEpisodes,
      hindiDub: rareEpisodes
    };
  } catch (error) {
    console.error("Error fetching episodes via cache:", error);
    return { sub: [], engDub: [], hindiDub: [] };
  }
});

async function WatchControls({ media, episodeId }) {
  const { sub, engDub, hindiDub } = await getEpisodesCached(media.title.romaji, media.title.english, media.format);
  const isHindiDub = episodeId.startsWith("rareanimes-");
  // Determine which episode list the current episode belongs to
  let episodes = sub;
  if (isHindiDub) {
    episodes = hindiDub;
  } else if (engDub.some(ep => ep.slug === episodeId)) {
    episodes = engDub;
  }
  const currentEpIndex = episodes.findIndex((ep) => ep.slug === episodeId);
  
  const prevEp = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;

  return (
    <div className="watch-controls glass-panel">
      <div className="episode-nav">
        {prevEp ? (
          <Link href={`/watch/${prevEp.slug}?animeId=${media.id}`} className="glow-btn-secondary ep-nav-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Prev Episode
          </Link>
        ) : (
          <button className="glow-btn-secondary ep-nav-btn disabled" disabled>
            Prev Episode
          </button>
        )}

        {nextEp ? (
          <Link href={`/watch/${nextEp.slug}?animeId=${media.id}`} className="glow-btn ep-nav-btn">
            Next Episode
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <button className="glow-btn ep-nav-btn disabled" disabled>
            Next Episode
          </button>
        )}
      </div>
    </div>
  );
}

async function EpisodesSidebar({ media, episodeId }) {
  const { sub, engDub, hindiDub } = await getEpisodesCached(media.title.romaji, media.title.english, media.format);
  
  return (
    <EpisodesList
      subEpisodes={sub}
      engDubEpisodes={engDub}
      hindiDubEpisodes={hindiDub}
      animeId={media.id}
      currentEpisodeId={episodeId}
      variant="sidebar"
    />
  );
}

export default async function Watch({ params, searchParams }) {
  const { episodeId } = await params;
  const sParams = await searchParams;
  const animeId = sParams.animeId;

  if (!animeId) {
    return (
      <>
        <Navbar />
        <div className="main-container error-container">
          <h2>Invalid Watch Link</h2>
          <p>Missing anime context. Return to search or home.</p>
          <Link href="/" className="glow-btn">Back to Home</Link>
        </div>
      </>
    );
  }

  // 1. Fetch AniList Metadata and Video Servers in parallel
  // This is much faster since it skips searching Gogoanime for the full anime!
  const [media, serverData] = await Promise.all([
    getAnimeDetails(animeId),
    getEpisodeServers(episodeId)
  ]);

  if (!media) {
    return (
      <>
        <Navbar />
        <div className="main-container error-container">
          <h2>Anime not found</h2>
          <p>We couldn't retrieve the details for this anime.</p>
          <Link href="/" className="glow-btn">Back to Home</Link>
        </div>
      </>
    );
  }

  // Get next episode slug for autoplay
  const { sub, engDub, hindiDub } = await getEpisodesCached(media.title.romaji, media.title.english, media.format);
  const isHindiDub = episodeId.startsWith("rareanimes-");
  let episodes = sub;
  if (isHindiDub) {
    episodes = hindiDub;
  } else if (engDub.some(ep => ep.slug === episodeId)) {
    episodes = engDub;
  }
  const currentEpIndex = episodes.findIndex((ep) => ep.slug === episodeId);
  const nextEp = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;

  // Try to parse out the episode number from the slug for a quick title update
  const epNumMatch = episodeId.match(/-episode-(\d+(\.\d+)?)/i);
  const epNumFallback = epNumMatch ? epNumMatch[1] : "";
  const displayTitle = media.title.english || media.title.romaji;
  const epLabel = epNumFallback ? `Episode ${epNumFallback}` : "Streaming";

  return (
    <>
      <Navbar />
      
      <main className="main-container watch-main">
        {/* Breadcrumb / Title Info */}
        <div className="watch-header">
          <Link href={`/anime/${media.id}`} className="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Details
          </Link>
          <h1 className="watch-title-text">
            {displayTitle} <span className="ep-label-highlight">— {epLabel}</span>
          </h1>
        </div>

        {/* Watch Content Grid */}
        <div className="watch-grid">
          {/* Left Column: Player & Meta */}
          <div className="watch-left">
            <WatchPlayer 
              initialServers={serverData.servers} 
              episodeSlug={episodeId} 
              nextEpisodeSlug={nextEp?.slug}
              animeId={media.id}
            />

            {/* Navigation & Controls */}
            <Suspense fallback={
              <div className="watch-controls glass-panel" style={{ opacity: 0.5, height: '70px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ textAlign: "center", lineHeight: "38px" }}>Loading controls...</div>
              </div>
            }>
              <WatchControls media={media} episodeId={episodeId} />
            </Suspense>

            {/* Details panel */}
            <div className="watch-meta-details glass-panel">
              <div className="watch-meta-flex">
                <Image
                  src={media.coverImage.large}
                  alt={displayTitle}
                  className="watch-meta-poster"
                  width={110}
                  height={160}
                />
                <div className="watch-meta-info">
                  <h3>{displayTitle}</h3>
                  <div className="watch-meta-tags">
                    <span className="meta-tag rating">★ {media.averageScore ? (media.averageScore / 10).toFixed(1) : "N/A"}</span>
                    <span className="meta-tag format">{media.format || "TV"}</span>
                    <span className="meta-tag year">{media.seasonYear}</span>
                  </div>
                  <p className="watch-meta-desc">
                    {media.description ? media.description.replace(/<[^>]*>/g, "") : "No description available."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Episode Sidebar */}
          <div className="watch-right">
            <Suspense fallback={
              <div className="episodes-sidebar glass-panel" style={{ opacity: 0.5 }}>
                <h3 className="sidebar-title">Episodes</h3>
                <div className="sidebar-list">
                  <div style={{ padding: "1rem", textAlign: "center" }}>Loading episodes...</div>
                </div>
              </div>
            }>
              <EpisodesSidebar media={media} episodeId={episodeId} />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
