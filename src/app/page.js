import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import AnimeCard from "@/components/AnimeCard";
import { getTrending, getPopular, getTopAiring } from "@/lib/anilist";

export const revalidate = 3600; // ISR: Revalidate page every hour

export default async function Home() {
  // Fetch lists in parallel
  const [trending, popular, topAiring] = await Promise.all([
    getTrending(1, 10),
    getPopular(1, 12),
    getTopAiring(1, 12),
  ]);

  const spotlightAnime = trending.slice(0, 5);

  return (
    <>
      <Navbar />
      
      {/* Dynamic Hero Spotlight Carousel */}
      <HeroCarousel animeList={spotlightAnime} />

      <main className="main-container">
        {/* Trending Section */}
        <section className="home-section">
          <h2 className="section-title">Trending Now</h2>
          <div className="anime-grid">
            {trending.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        </section>

        {/* Popular Section */}
        <section className="home-section">
          <h2 className="section-title">Popular of the Season</h2>
          <div className="anime-grid">
            {popular.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        </section>

        {/* Top Airing Section */}
        <section className="home-section">
          <h2 className="section-title">Top Airing</h2>
          <div className="anime-grid">
            {topAiring.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        </section>
      </main>

      <footer className="footer glass-panel">
        <div className="footer-content main-container">
          <div className="footer-logo">
            <span className="logo-highlight">Hulix</span> Anime
          </div>
          <p className="footer-text">
            © {new Date().getFullYear()} Hulix Anime. Built for educational purposes. 
            All metadata is sourced from AniList API and streams are scraped dynamically.
          </p>
        </div>
      </footer>
    </>
  );
}
