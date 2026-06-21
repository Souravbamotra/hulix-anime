import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import GenreFilterBar from '@/components/GenreFilterBar';
import { searchAnime, getAnimeByGenre, getTrending, getPopular } from '@/lib/anilist';
import Link from 'next/link';
import { Suspense } from 'react';

export const revalidate = 600;

export default async function Search({ searchParams }) {
  const sParams     = await searchParams;
  const query       = sParams.q     || '';
  const genre       = sParams.genre || '';
  const currentPage = Math.max(1, parseInt(sParams.page || '1', 10));

  let animeList = [];
  let pageInfo  = { hasNextPage: false, currentPage: 1, total: 0 };
  let pageTitle = 'Browse Anime';
  let subtitle  = 'Pick a genre or search above';

  try {
    if (genre) {
      const result = await getAnimeByGenre(genre, currentPage, 24);
      animeList = result.media;
      pageInfo  = result.pageInfo;
      pageTitle = `${genre} Anime`;
      subtitle  = `${result.pageInfo.total ?? '?'} total results`;
    } else if (query.toLowerCase() === 'trending') {
      animeList = await getTrending(1, 24);
      pageTitle = 'Trending Anime';
      subtitle  = 'The most viewed anime right now';
    } else if (query.toLowerCase() === 'popular') {
      animeList = await getPopular(1, 24);
      pageTitle = 'Popular Anime';
      subtitle  = 'All-time popular anime series';
    } else if (query.trim()) {
      const searchData = await searchAnime(query, 1, 24);
      animeList = searchData.media || [];
      pageTitle = `Results for "${query}"`;
      subtitle  = `${animeList.length} result${animeList.length !== 1 ? 's' : ''} found`;
    }
  } catch (error) {
    console.error('Search fetch error:', error);
  }

  const prevPageHref = `/search?genre=${encodeURIComponent(genre)}&page=${currentPage - 1}`;
  const nextPageHref = `/search?genre=${encodeURIComponent(genre)}&page=${currentPage + 1}`;

  return (
    <>
      <Navbar />

      <main className="main-container search-page-main">
        <div className="search-header-container">
          <h1 className="section-title search-page-title">{pageTitle}</h1>
          <p className="search-subtitle">{subtitle}</p>
        </div>

        {/* Genre filter bar */}
        <div className="genre-bar-section">
          <p className="genre-bar-label">Browse by genre</p>
          <Suspense fallback={<div style={{ height: 38 }} />}>
            <GenreFilterBar />
          </Suspense>
        </div>

        {/* Results grid */}
        {animeList.length > 0 ? (
          <>
            <div className="anime-grid">
              {animeList.map((anime) => (
                <AnimeCard key={anime.id} {...anime} />
              ))}
            </div>

            {/* Pagination — only shown for genre browsing */}
            {genre && (
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
            )}
          </>
        ) : (query || genre) ? (
          <div className="no-results-panel glass-panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3>No results found</h3>
            <p>We couldn&apos;t find any anime matching &ldquo;{genre || query}&rdquo;. Try a different search or genre.</p>
            <Link href="/" className="glow-btn">Back to Home</Link>
          </div>
        ) : null}
      </main>
    </>
  );
}
