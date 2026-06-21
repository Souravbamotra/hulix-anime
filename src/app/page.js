import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import AnimeCard from "@/components/AnimeCard";
import { getTrending, getPopular, getTopAiring, getAnimeByGenre } from "@/lib/anilist";
import ContinueWatching from "@/components/ContinueWatching";
import GenreFilterBar from "@/components/GenreFilterBar";
import Link from "next/link";
import { Suspense } from "react";

export const revalidate = 3600;

export default async function Home({ searchParams }) {
  const sParams      = await searchParams;
  const activeGenre  = sParams.genre || "";
  const currentPage  = Math.max(1, parseInt(sParams.page || "1", 10));

  const [trending, popular, topAiring] = await Promise.all([
    getTrending(1, 10),
    getPopular(1, 12),
    getTopAiring(1, 12),
  ]);

  const spotlightAnime = trending.slice(0, 5);

  let genreResults = [];
  let pageInfo     = { hasNextPage: false, currentPage: 1, total: 0 };
  if (activeGenre) {
    const result = await getAnimeByGenre(activeGenre, currentPage, 24).catch(() => ({ media: [], pageInfo }));
    genreResults = result.media;
    pageInfo     = result.pageInfo;
  }

  const prevPageHref = `/?genre=${encodeURIComponent(activeGenre)}&page=${currentPage - 1}`;
  const nextPageHref = `/?genre=${encodeURIComponent(activeGenre)}&page=${currentPage + 1}`;

  return (
    <>
      <Navbar />
      <HeroCarousel animeList={spotlightAnime} />

      <main className="main-container">
        <ContinueWatching />

        {/* Genre Filter Bar */}
        <div className="genre-bar-section">
          <p className="genre-bar-label">Browse by genre</p>
          <Suspense fallback={<div style={{ height: 38 }} />}>
            <GenreFilterBar />
          </Suspense>
        </div>

        {/* Genre Results */}
        {activeGenre ? (
          <section className="home-section">
            <h2 className="section-title">{activeGenre} Anime</h2>

            {genreResults.length > 0 ? (
              <>
                <div className="anime-grid">
                  {genreResults.map((anime) => (
                    <AnimeCard key={anime.id} {...anime} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="pagination-row">
                  {currentPage > 1 ? (
                    <Link href={prevPageHref} scroll={false} className="pagination-btn">
                      ← Previous
                    </Link>
                  ) : (
                    <span className="pagination-btn pagination-btn-disabled">← Previous</span>
                  )}

                  <span className="pagination-info">Page {currentPage}</span>

                  {pageInfo.hasNextPage ? (
                    <Link href={nextPageHref} scroll={false} className="pagination-btn">
                      Next →
                    </Link>
                  ) : (
                    <span className="pagination-btn pagination-btn-disabled">Next →</span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                No results found for &ldquo;{activeGenre}&rdquo;.
              </p>
            )}
          </section>
        ) : (
          <>
            <section className="home-section">
              <h2 className="section-title">Trending Now</h2>
              <div className="anime-grid">
                {trending.map((anime) => (
                  <AnimeCard key={anime.id} {...anime} />
                ))}
              </div>
            </section>

            <section className="home-section">
              <h2 className="section-title">Popular of the Season</h2>
              <div className="anime-grid">
                {popular.map((anime) => (
                  <AnimeCard key={anime.id} {...anime} />
                ))}
              </div>
            </section>

            <section className="home-section">
              <h2 className="section-title">Top Airing</h2>
              <div className="anime-grid">
                {topAiring.map((anime) => (
                  <AnimeCard key={anime.id} {...anime} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer glass-panel">
        <div className="footer-content main-container">
          <div className="footer-logo">
            <span className="logo-highlight">Hulix</span> Anime
          </div>
          <p className="footer-text">
            © {new Date().getFullYear()} Hulix Anime. Built for educational purposes.{" "}
            All metadata is sourced from AniList API and streams are scraped dynamically.
          </p>
        </div>
      </footer>
    </>
  );
}
