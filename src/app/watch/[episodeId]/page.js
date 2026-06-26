import { Suspense, cache } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import WatchPlayer from "@/components/WatchPlayer";
import BackToDetailsButton from "@/components/BackToDetailsButton";
import EpisodesList from "@/components/EpisodesList";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getAnimeDetails } from "@/lib/anilist";
import { findGogoAnimeSlug, getAnimeEpisodes, getEpisodeServers, findRareAnimesSlug, getRareAnimesEpisodes, getAnidapEpisodes, findToonStreamSlug, getToonStreamEpisodes } from "@/lib/scraper";
import { fetchFillerList, getFillerSlug } from "@/lib/filler";

export const unstable_instant = {
  prefetch: 'runtime',
  samples: [
    {
      params: { episodeId: 'one-piece-episode-1' },
      searchParams: { animeId: '21' }
    }
  ],
  unstable_disableValidation: true
};

export async function generateMetadata({ params, searchParams }) {
  const { episodeId } = await params;
  const sParams = await searchParams;
  const animeId = sParams.animeId;
  
  if (!animeId) {
    return {
      title: "Streaming | Hulix Anime",
      description: "Watch anime episodes online on Hulix Anime.",
    };
  }

  try {
    const media = await getAnimeDetails(animeId);
    if (!media) {
      return {
        title: "Streaming | Hulix Anime",
        description: "Watch anime episodes online on Hulix Anime.",
      };
    }

    const epNumMatch = episodeId.match(/-episode-(\d+(\.\d+)?)/i);
    const epNumFallback = epNumMatch ? epNumMatch[1] : "";
    const epLabel = epNumFallback ? `Episode ${epNumFallback}` : "Streaming";
    const displayTitle = media.title.english || media.title.romaji;

    const title = `Watch ${displayTitle} ${epLabel} | Hulix Anime`;
    const description = `Watch ${displayTitle} ${epLabel} in high quality with Hindi and English Dub/Sub. Stream online on Hulix Anime.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: media.bannerImage || media.coverImage.extraLarge || media.coverImage.large,
            alt: displayTitle,
          },
        ],
      },
    };
  } catch (error) {
    return {
      title: "Streaming | Hulix Anime",
      description: "Watch anime online on Hulix Anime.",
    };
  }
}

const getEpisodesCached = cache(async (romaji, english, format, anilistId, totalEpisodes, seasonYear) => {
  try {
    const [gogoSubSlug, gogoDubSlug, rareSlug, toonSlug] = await Promise.all([
      findGogoAnimeSlug(romaji, english, format, false, seasonYear),
      findGogoAnimeSlug(romaji, english, format, true, seasonYear),
      findRareAnimesSlug(romaji, english, format, seasonYear),
      findToonStreamSlug(romaji, english, format, seasonYear)
    ]);
    
    let [gogoSubEpisodes, gogoDubEpisodes, rareEpisodes, toonEpisodes] = await Promise.all([
      gogoSubSlug ? getAnimeEpisodes(gogoSubSlug) : Promise.resolve([]),
      gogoDubSlug ? getAnimeEpisodes(gogoDubSlug) : Promise.resolve([]),
      rareSlug ? getRareAnimesEpisodes(rareSlug) : Promise.resolve([]),
      toonSlug ? getToonStreamEpisodes(toonSlug) : Promise.resolve([])
    ]);
    
    // Choose the provider that has more Hindi Dub episodes, but override for One Piece
    const cleanRomaji = (romaji || "").toLowerCase();
    const cleanEnglish = (english || "").toLowerCase();
    const isOnePiece = cleanRomaji.includes("one piece") || cleanEnglish.includes("one piece");

    if (isOnePiece) {
      console.log(`[Watch Page] Overriding provider for One Piece: using RareAnimes.`);
      if (rareEpisodes.length > 0) {
        // Keep RareAnimes episodes
      } else {
        rareEpisodes = toonEpisodes;
      }
    } else if (toonEpisodes.length > rareEpisodes.length) {
      console.log(`[Watch Page] ToonStream has more Hindi Dub episodes (${toonEpisodes.length}) than RareAnimes (${rareEpisodes.length}). Using ToonStream.`);
      rareEpisodes = toonEpisodes;
    } else {
      console.log(`[Watch Page] Using RareAnimes Hindi Dub episodes (${rareEpisodes.length})`);
    }
    
    // Validate GogoAnime episodes count
    const isCombined = ["one piece", "black clover", "detective conan", "pokemon", "fairy tail", "doraemon"].some(
      t => cleanRomaji.includes(t) || cleanEnglish.includes(t)
    );
    
    if (totalEpisodes && !isCombined) {
      if (gogoSubEpisodes.length > totalEpisodes) {
        console.warn(`[Watch Page] GogoAnime sub episodes count mismatch (expected ${totalEpisodes}, got ${gogoSubEpisodes.length})`);
      }
      if (gogoDubEpisodes.length > totalEpisodes) {
        console.warn(`[Watch Page] GogoAnime dub episodes count mismatch (expected ${totalEpisodes}, got ${gogoDubEpisodes.length})`);
      }
      if (rareEpisodes.length > totalEpisodes) {
        console.warn(`[Watch Page] RareAnimes/ToonStream episodes count mismatch (expected ${totalEpisodes}, got ${rareEpisodes.length})`);
      }
    }

    // AniDap Fallback integration (AniDap uses AniList ID for 'id' parameter)
    const subCount = gogoSubEpisodes.length;
    if (anilistId && (subCount === 0 || (totalEpisodes && subCount < totalEpisodes))) {
      console.log(`[Watch Page] GogoAnime sub episodes count (${subCount}) is less than expected (${totalEpisodes}). Fetching AniDap fallback for AniList ID: ${anilistId}`);
      const anidapSub = await getAnidapEpisodes(anilistId, false, totalEpisodes);
      if (anidapSub && anidapSub.length > subCount) {
        gogoSubEpisodes = anidapSub;
      }
    }
    
    const dubCount = gogoDubEpisodes.length;
    if (anilistId && (dubCount === 0 || (totalEpisodes && dubCount < totalEpisodes))) {
      console.log(`[Watch Page] GogoAnime dub episodes count (${dubCount}) is less than expected (${totalEpisodes}). Fetching AniDap fallback for AniList ID: ${anilistId}`);
      const anidapDub = await getAnidapEpisodes(anilistId, true, totalEpisodes);
      if (anidapDub && anidapDub.length > dubCount) {
        gogoDubEpisodes = anidapDub;
      }
    }
    
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
  const { sub, engDub, hindiDub } = await getEpisodesCached(media.title.romaji, media.title.english, media.format, media.id, media.episodes, media.seasonYear);
  const isHindiDub = episodeId.startsWith("rareanimes-") || episodeId.startsWith("toonstream-");
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

async function EpisodesSidebar({ media, episodeId, fillerList }) {
  const { sub, engDub, hindiDub } = await getEpisodesCached(media.title.romaji, media.title.english, media.format, media.id, media.episodes, media.seasonYear);
  
  return (
    <EpisodesList
      subEpisodes={sub}
      engDubEpisodes={engDub}
      hindiDubEpisodes={hindiDub}
      animeId={media.id}
      currentEpisodeId={episodeId}
      fillerList={fillerList}
      variant="sidebar"
    />
  );
}

async function WatchPlayerSection({ media, episodeId, fillerList }) {
  const [episodeData, serverData] = await Promise.all([
    getEpisodesCached(media.title.romaji, media.title.english, media.format, media.id, media.episodes, media.seasonYear),
    getEpisodeServers(episodeId)
  ]);
  const { sub, engDub, hindiDub } = episodeData;
  const isHindiDub = episodeId.startsWith("rareanimes-") || episodeId.startsWith("toonstream-");
  let episodes = sub;
  if (isHindiDub) {
    episodes = hindiDub;
  } else if (engDub.some(ep => ep.slug === episodeId)) {
    episodes = engDub;
  }
  const currentEpIndex = episodes.findIndex((ep) => ep.slug === episodeId);
  const nextEp = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;

  const epNumMatch = episodeId.match(/-episode-(\d+(\.\d+)?)/i);
  const epNumFallback = epNumMatch ? epNumMatch[1] : "";
  const displayTitle = media.title.english || media.title.romaji;
  const epLabel = epNumFallback ? `Episode ${epNumFallback}` : "Streaming";
  const currentEpNumber = currentEpIndex >= 0 ? episodes[currentEpIndex].number : (epNumFallback ? parseFloat(epNumFallback) : 1);
  const resolvedLang = isHindiDub ? "hindi" : (episodes === engDub ? "dub" : "sub");

  return (
    <WatchPlayer
      key={episodeId}
      initialServers={serverData?.servers || []}
      episodeSlug={episodeId}
      nextEpisodeSlug={nextEp?.slug}
      animeId={media.id}
      malId={media.idMal}
      animeTitle={displayTitle}
      animeCover={media.coverImage.large}
      episodeNumber={currentEpNumber}
      episodeTitle={epLabel}
      language={resolvedLang}
      episodeLength={media.duration ? media.duration * 60 : 1440}
      episodes={episodes}
      fillerList={fillerList}
    />
  );
}

function WatchPageSkeleton() {
  return (
    <main className="main-container watch-main" style={{ marginTop: 24 }}>
      <div className="watch-header skeleton" style={{ height: 40, width: "60%", marginBottom: 24, borderRadius: 8 }} />
      
      <div className="watch-grid">
        <div className="watch-left">
          <div className="player-placeholder glass-panel skeleton" style={{ aspectRatio: "16 / 9" }}>
            <div className="placeholder-content">
              <div className="loading-spinner" />
              <p>Loading player...</p>
            </div>
          </div>
          
          <div className="watch-controls glass-panel skeleton" style={{ height: 70 }} />
          
          <div className="watch-meta-details glass-panel skeleton" style={{ height: 200 }} />
        </div>
        
        <div className="watch-right">
          <div className="episodes-sidebar glass-panel skeleton" style={{ height: 600 }} />
        </div>
      </div>
    </main>
  );
}

async function WatchContent({ params, searchParams }) {
  const { episodeId } = await params;
  const sParams = await searchParams;
  const animeId = sParams.animeId;

  if (!animeId) {
    return (
      <div className="main-container error-container">
        <h2>Invalid Watch Link</h2>
        <p>Missing anime context. Return to search or home.</p>
        <Link href="/" className="glow-btn">Back to Home</Link>
      </div>
    );
  }

  // Fetch AniList metadata — this is all we need to start rendering immediately
  const media = await getAnimeDetails(animeId);

  if (!media) {
    return (
      <div className="main-container error-container">
        <h2>Anime not found</h2>
        <p>We couldn&apos;t retrieve the details for this anime.</p>
        <Link href="/" className="glow-btn">Back to Home</Link>
      </div>
    );
  }

  // Fetch filler list if available
  const fillerSlug = getFillerSlug(media.title.romaji, media.title.english);
  const fillerList = fillerSlug ? await fetchFillerList(fillerSlug) : {};

  // Parse episode number from slug for immediate title display (no scraping needed)
  const epNumMatch = episodeId.match(/-episode-(\d+(\.\d+)?)/i);
  const epNumFallback = epNumMatch ? epNumMatch[1] : "";
  const displayTitle = media.title.english || media.title.romaji;
  const epLabel = epNumFallback ? `Episode ${epNumFallback}` : "Streaming";

  return (
    <main className="main-container watch-main">
      {/* Breadcrumb / Title Info */}
      <div className="watch-header">
        <BackToDetailsButton animeId={media.id}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Details
        </BackToDetailsButton>
        <h1 className="watch-title-text">
          {displayTitle} <span className="ep-label-highlight">— {epLabel}</span>
        </h1>
      </div>

      {/* Watch Content Grid */}
      <div className="watch-grid">
        {/* Left Column: Player & Meta */}
        <div className="watch-left">
          {/* Player — Suspense lets the page shell render immediately while episode list resolves.
               ErrorBoundary catches scraper failures so the rest of the page stays intact. */}
          <ErrorBoundary
            title="Player unavailable"
            description="The video source couldn't be loaded. The upstream provider may be temporarily down."
          >
            <Suspense fallback={
              <div className="player-placeholder glass-panel">
                <div className="placeholder-content">
                  <div className="loading-spinner" />
                  <p>Loading player...</p>
                </div>
              </div>
            }>
              <WatchPlayerSection media={media} episodeId={episodeId} fillerList={fillerList} />
            </Suspense>
          </ErrorBoundary>

          {/* Navigation & Controls */}
          <ErrorBoundary title="Navigation unavailable" description="Episode navigation couldn't be loaded.">
            <Suspense fallback={
              <div className="watch-controls glass-panel" style={{ opacity: 0.5, height: '70px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ textAlign: "center", lineHeight: "38px" }}>Loading controls...</div>
              </div>
            }>
              <WatchControls media={media} episodeId={episodeId} />
            </Suspense>
          </ErrorBoundary>

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
          <ErrorBoundary title="Episode list unavailable" description="The episode list couldn't be loaded. Try refreshing the page.">
            <Suspense fallback={
              <div className="episodes-sidebar glass-panel" style={{ opacity: 0.5 }}>
                <h3 className="sidebar-title">Episodes</h3>
                <div className="sidebar-list">
                  <div style={{ padding: "1rem", textAlign: "center" }}>Loading episodes...</div>
                </div>
              </div>
            }>
              <EpisodesSidebar media={media} episodeId={episodeId} fillerList={fillerList} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}

export default function Watch({ params, searchParams }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<WatchPageSkeleton />}>
        <WatchContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
