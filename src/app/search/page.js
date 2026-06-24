import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import GenreFilterBar from '@/components/GenreFilterBar';
import { searchAnime, getAnimeByGenre, getTrending, getPopular, getExactSearchCount, getTopAiring } from '@/lib/anilist';
import Link from 'next/link';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true
};

function SearchPageSkeleton() {
  return (
    <main className="main-container search-page-main" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
      <div className="search-header-container skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 30 }} />
      <div className="genre-bar-section skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 30 }} />
      <div className="anime-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="glass-card skeleton" style={{ aspectRatio: "11/16", borderRadius: 12, height: "100%" }} />
        ))}
      </div>
    </main>
  );
}

async function SearchContent({ searchParams }) {
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
      
      const totalGenre = result.pageInfo.total;
      if (totalGenre >= 5000) {
        subtitle = "5,000+ results found";
      } else if (totalGenre) {
        subtitle = `${totalGenre.toLocaleString()} results found`;
      } else {
        subtitle = `${animeList.length} results found`;
      }
    } else if (query.toLowerCase() === 'trending') {
      animeList = await getTrending(currentPage, 24);
      pageInfo  = { hasNextPage: animeList.length === 24, currentPage };
      pageTitle = 'Trending Anime';
      subtitle  = "The most viewed anime right now";
    } else if (query.toLowerCase() === 'popular') {
      animeList = await getPopular(currentPage, 24);
      pageInfo  = { hasNextPage: animeList.length === 24, currentPage };
      pageTitle = 'Popular Anime';
      subtitle  = "All-time popular anime series";
    } else if (query.toLowerCase() === 'airing' || query.toLowerCase() === 'top-airing') {
      animeList = await getTopAiring(currentPage, 24);
      pageInfo  = { hasNextPage: animeList.length === 24, currentPage };
      pageTitle = 'Top Airing Anime';
      subtitle  = "Currently releasing anime series";
    } else if (query.trim()) {
      const [searchData, exactCount] = await Promise.all([
        searchAnime(query, currentPage, 24),
        getExactSearchCount(query)
      ]);
      animeList = searchData.media || [];
      pageInfo  = searchData.pageInfo || { hasNextPage: false, currentPage: 1, total: 0 };
      pageTitle = `Results for "${query}"`;
      
      const displayCount = (exactCount > 0 && exactCount < 100) ? exactCount : pageInfo.total;
      if (displayCount >= 5000) {
        subtitle = "5,000+ results found";
      } else if (exactCount === 100 && displayCount >= 100) {
        subtitle = "100+ results found";
      } else if (displayCount) {
        subtitle = `${displayCount.toLocaleString()} results found`;
      } else {
        subtitle = `${animeList.length} results found`;
      }
    }
  } catch (error) {
    console.error('Search fetch error:', error);
  }

  let prevPageHref = '#';
  let nextPageHref = '#';
  if (genre) {
    prevPageHref = `/search?genre=${encodeURIComponent(genre)}&page=${currentPage - 1}`;
    nextPageHref = `/search?genre=${encodeURIComponent(genre)}&page=${currentPage + 1}`;
  } else if (query) {
    prevPageHref = `/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`;
    nextPageHref = `/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`;
  }

  return (
    <main className="main-container search-page-main">
      <div className="search-header-container">
        <h1 className="section-title search-page-title">
          <span>{pageTitle}</span>
          {currentPage > 1 && <span className="page-badge">Page {currentPage}</span>}
        </h1>
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

          {/* Pagination */}
          {(pageInfo.hasNextPage || currentPage > 1) && (
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
  );
}

export default function Search({ searchParams }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<SearchPageSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
