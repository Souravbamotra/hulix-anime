import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import { searchAnime, getTrending, getPopular } from "@/lib/anilist";
import Link from "next/link";

export const revalidate = 600; // Cache search pages for 10 minutes

export default async function Search({ searchParams }) {
  const sParams = await searchParams;
  const query = sParams.q || "";
  
  let animeList = [];
  let pageTitle = "Search Results";
  let subtitle = `Found results for "${query}"`;
  
  try {
    if (query.toLowerCase() === "trending") {
      animeList = await getTrending(1, 24);
      pageTitle = "Trending Anime";
      subtitle = "The most viewed and popular anime right now";
    } else if (query.toLowerCase() === "popular") {
      animeList = await getPopular(1, 24);
      pageTitle = "Popular Anime";
      subtitle = "All-time popular anime series";
    } else if (query.trim()) {
      const searchData = await searchAnime(query, 1, 24);
      animeList = searchData.media || [];
    } else {
      pageTitle = "Browse Anime";
      subtitle = "Start typing in the search bar above to search";
    }
  } catch (error) {
    console.error("Search fetch error on server:", error);
  }

  return (
    <>
      <Navbar />
      
      <main className="main-container search-page-main">
        {/* Search header info */}
        <div className="search-header-container">
          <h1 className="section-title search-page-title">{pageTitle}</h1>
          <p className="search-subtitle">{subtitle}</p>
        </div>

        {/* Results Grid */}
        {animeList.length > 0 ? (
          <div className="anime-grid">
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        ) : (
          <div className="no-results-panel glass-panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3>No results found</h3>
            <p>We couldn't find any anime matching "{query}". Try checking your spelling or search for something else.</p>
            <Link href="/" className="glow-btn">Back to Home</Link>
          </div>
        )}
      </main>
    </>
  );
}
