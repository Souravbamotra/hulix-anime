import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { getAnimeDetails } from "@/lib/anilist";
import { findGogoAnimeSlug, getAnimeEpisodes, findRareAnimesSlug, getRareAnimesEpisodes, getAnidapEpisodes } from "@/lib/scraper";
import EpisodesList from "@/components/EpisodesList";
import { fetchFillerList, getFillerSlug } from "@/lib/filler";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const media = await getAnimeDetails(id);
    if (!media) {
      return {
        title: "Anime Not Found | Hulix Anime",
        description: "We couldn't retrieve the details for this anime.",
      };
    }
    const displayTitle = media.title.english || media.title.romaji;
    const cleanDescription = media.description
      ? media.description.replace(/<[^>]*>/g, "").slice(0, 160) + "..."
      : `Watch ${displayTitle} on Hulix Anime.`;

    return {
      title: `${displayTitle} | Hulix Anime`,
      description: cleanDescription,
      openGraph: {
        title: `${displayTitle} | Hulix Anime`,
        description: cleanDescription,
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
      title: "Hulix Anime",
      description: "Watch anime online on Hulix Anime.",
    };
  }
}

export const revalidate = 1800; // Cache detail pages for 30 minutes

async function EpisodeListSection({ media }) {
  let subEpisodes = [];
  let engDubEpisodes = [];
  let hindiDubEpisodes = [];
  let fillerList = {};
  try {
    const fillerSlug = getFillerSlug(media.title.romaji, media.title.english);
    const [gogoSubSlug, gogoDubSlug, rareSlug, fillerData] = await Promise.all([
      findGogoAnimeSlug(media.title.romaji, media.title.english, media.format, false),
      findGogoAnimeSlug(media.title.romaji, media.title.english, media.format, true),
      findRareAnimesSlug(media.title.romaji, media.title.english, media.format),
      fillerSlug ? fetchFillerList(fillerSlug) : Promise.resolve({})
    ]);

    fillerList = fillerData || {};

    const [gogoSubRes, gogoDubRes, rareRes] = await Promise.all([
      gogoSubSlug ? getAnimeEpisodes(gogoSubSlug) : Promise.resolve([]),
      gogoDubSlug ? getAnimeEpisodes(gogoDubSlug) : Promise.resolve([]),
      rareSlug ? getRareAnimesEpisodes(rareSlug) : Promise.resolve([])
    ]);
    
    subEpisodes = gogoSubRes;
    engDubEpisodes = gogoDubRes;
    hindiDubEpisodes = rareRes;

    // Validate GogoAnime episodes count
    const cleanRomaji = (media.title.romaji || "").toLowerCase();
    const cleanEnglish = (media.title.english || "").toLowerCase();
    const isCombined = ["one piece", "black clover", "detective conan", "pokemon", "fairy tail", "doraemon"].some(
      t => cleanRomaji.includes(t) || cleanEnglish.includes(t)
    );
    
    if (media.episodes && !isCombined) {
      if (subEpisodes.length > media.episodes) {
        console.warn(`[Details Page] Rejecting GogoAnime sub episodes due to mismatch (expected ${media.episodes}, got ${subEpisodes.length})`);
        subEpisodes = [];
      }
      if (engDubEpisodes.length > media.episodes) {
        console.warn(`[Details Page] Rejecting GogoAnime dub episodes due to mismatch (expected ${media.episodes}, got ${engDubEpisodes.length})`);
        engDubEpisodes = [];
      }
    }

    // AniDap Fallback integration (AniDap uses AniList ID for 'id' parameter)
    const subCount = subEpisodes.length;
    if (media.id && (subCount === 0 || (media.episodes && subCount < media.episodes))) {
      console.log(`[Details Page] GogoAnime sub episodes count (${subCount}) is less than expected (${media.episodes}). Fetching AniDap fallback for AniList ID: ${media.id}`);
      const anidapSub = await getAnidapEpisodes(media.id, false, media.episodes);
      if (anidapSub && anidapSub.length > subCount) {
        subEpisodes = anidapSub;
      }
    }
    const dubCount = engDubEpisodes.length;
    if (media.id && (dubCount === 0 || (media.episodes && dubCount < media.episodes))) {
      console.log(`[Details Page] GogoAnime dub episodes count (${dubCount}) is less than expected (${media.episodes}). Fetching AniDap fallback for AniList ID: ${media.id}`);
      const anidapDub = await getAnidapEpisodes(media.id, true, media.episodes);
      if (anidapDub && anidapDub.length > dubCount) {
        engDubEpisodes = anidapDub;
      }
    }
  } catch (error) {
    console.error("Failed to fetch episodes on server:", error);
  }

  return (
    <EpisodesList
      subEpisodes={subEpisodes}
      engDubEpisodes={engDubEpisodes}
      hindiDubEpisodes={hindiDubEpisodes}
      animeId={media.id}
      fillerList={fillerList}
      variant="grid"
    />
  );
}

function EpisodesSkeleton() {
  return (
    <div className="episodes-section glass-panel">
      <h3 className="episodes-section-title">
        Watch Episodes
        <span className="ep-count">Loading episodes...</span>
      </h3>
      <div className="episodes-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="episode-btn loading-skeleton" style={{ height: '40px', opacity: 0.5, animation: 'pulse 1.5s infinite', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        ))}
      </div>
    </div>
  );
}

export default async function AnimeDetails({ params }) {
  const { id } = await params;
  
  // 1. Fetch details from AniList
  const media = await getAnimeDetails(id);
  if (!media) {
    return (
      <>
        <Navbar />
        <div className="main-container error-container">
          <h2>Anime not found</h2>
          <p>We couldn&apos;t retrieve the details for this anime.</p>
          <Link href="/" className="glow-btn">Back to Home</Link>
        </div>
      </>
    );
  }

  const cleanDescription = media.description
    ? media.description.replace(/<[^>]*>/g, "")
    : "No description available.";

  const displayTitle = media.title.english || media.title.romaji;
  const subTitle = media.title.romaji !== displayTitle ? media.title.romaji : media.title.native;
  const rating = media.averageScore ? (media.averageScore / 10).toFixed(1) : "N/A";
  
  // Filter out recommendations that don't have mediaRecommendation details
  const recommendations = media.recommendations?.nodes
    ?.map(n => n.mediaRecommendation)
    ?.filter(Boolean)
    ?.slice(0, 6) || [];

  return (
    <>
      <Navbar />
      
      {/* Banner Section */}
      <div className="detail-banner-container">
        <Image
          src={media.bannerImage || media.coverImage.extraLarge}
          alt={displayTitle}
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center 20%" }}
          className="detail-banner-bg-img"
        />
        <div
          className="detail-banner-bg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to bottom, rgba(8, 7, 15, 0.4), rgba(8, 7, 15, 0.95))",
          }}
        />
      </div>

      <main className="main-container detail-main">
        {/* Info Grid */}
        <div className="detail-grid">
          {/* Left Column: Cover Art & Quick Info */}
          <div className="detail-left">
            <div className="detail-cover-wrapper glass-panel" style={{ position: "relative" }}>
              <Image
                src={media.coverImage.extraLarge}
                alt={displayTitle}
                className="detail-cover-img"
                fill
                priority
                sizes="(max-width: 960px) 300px, 300px"
              />
            </div>
            
            <div className="detail-quick-info glass-panel">
              <div className="info-item">
                <span className="info-label">Format</span>
                <span className="info-value">{media.format || "TV"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Episodes</span>
                <span className="info-value">{media.episodes || "Ongoing"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{media.status}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Studio</span>
                <span className="info-value">{media.studios?.nodes?.[0]?.name || "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Season</span>
                <span className="info-value">
                  {media.season ? `${media.season} ${media.seasonYear}` : media.seasonYear || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Description, Episodes */}
          <div className="detail-right">
            <div className="detail-header-panel">
              <h1 className="detail-title">{displayTitle}</h1>
              {subTitle && <h2 className="detail-subtitle">{subTitle}</h2>}
              
              <div className="detail-meta">
                <span className="detail-rating">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="star-icon">
                    <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/>
                  </svg>
                  {rating}
                </span>
                <span className="detail-duration">{media.duration ? `${media.duration} min` : "N/A"}</span>
              </div>

              <div className="detail-genres">
                {media.genres?.map((genre) => (
                  <span key={genre} className="genre-tag">{genre}</span>
                ))}
              </div>

              <p className="detail-desc">{cleanDescription}</p>
            </div>

            {/* Episode List Section loaded async */}
            <Suspense fallback={<EpisodesSkeleton />}>
              <EpisodeListSection media={media} />
            </Suspense>
          </div>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <section className="recommendations-section">
            <h2 className="section-title">You Might Also Like</h2>
            <div className="recommendations-grid">
              {recommendations.map((rec) => {
                const recTitle = rec.title.english || rec.title.romaji;
                return (
                  <Link key={rec.id} href={`/anime/${rec.id}`} className="rec-card-link">
                    <div className="glass-card rec-card">
                      <div className="rec-img-wrapper">
                        <Image
                          src={rec.coverImage.large}
                          alt={recTitle}
                          className="rec-img"
                          fill
                          sizes="(max-width: 640px) 140px, 180px"
                        />
                        {rec.averageScore && (
                          <div className="rec-rating">
                            {(rec.averageScore / 10).toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="rec-details">
                        <h4 className="rec-title">{recTitle}</h4>
                        <div className="rec-meta">{rec.format || "TV"}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
