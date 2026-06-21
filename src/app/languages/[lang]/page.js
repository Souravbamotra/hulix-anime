import { getTrending, getPopular } from '@/lib/anilist';
import AnimeCard from '@/components/AnimeCard';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const LANGUAGE_CONFIG = {
  hindi:          { label: 'Hindi Dubbed',   flag: '🇮🇳', source: 'RareAnimes', sourceUrl: 'https://rareanimes.mov' },
  'english-sub':  { label: 'English Subbed', flag: '🌐', source: '9Anime',    sourceUrl: 'https://9anime.org.lv'  },
  'english-dub':  { label: 'English Dubbed', flag: '🎙️', source: '9Anime',    sourceUrl: 'https://9anime.org.lv'  },
};

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const config = LANGUAGE_CONFIG[lang];
  return {
    title: config ? `${config.flag} ${config.label} Anime — Hulix` : 'Language Browse — Hulix',
    description: config
      ? `Browse and watch ${config.label} anime on Hulix, powered by ${config.source}.`
      : 'Browse anime by language on Hulix.',
  };
}

export default async function LanguagePage({ params }) {
  const { lang } = await params;
  const config = LANGUAGE_CONFIG[lang];

  if (!config) {
    return (
      <>
        <Navbar />
        <main className="main-container">
          <div className="lang-not-found">
            <p>Unknown language: &ldquo;{lang}&rdquo;</p>
            <Link href="/" className="glow-btn">Go Home</Link>
          </div>
        </main>
      </>
    );
  }

  const [trending, popular] = await Promise.all([
    getTrending(1, 12).catch(() => []),
    getPopular(1, 12).catch(() => []),
  ]);

  return (
    <>
      <Navbar />
      <main className="main-container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

        {/* Hero Banner */}
        <div className="lang-hero">
          <h1 className="lang-hero-title">
            {config.flag} {config.label}
          </h1>
          <p className="lang-hero-desc">
            Powered by <span>{config.source}</span> &bull; Browse any anime below, then
            select <span>{config.label}</span> on its page to watch.
          </p>
        </div>

        {/* Language switcher */}
        <div className="lang-switch-row">
          {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
            <Link
              key={key}
              href={`/languages/${key}`}
              className={`lang-switch-pill${key === lang ? ' lang-switch-pill-active' : ''}`}
            >
              {cfg.flag} {cfg.label}
            </Link>
          ))}
        </div>

        {/* Trending section */}
        <section className="lang-section">
          <h2 className="lang-section-title">🔥 Trending</h2>
          <div className="anime-grid">
            {trending.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        </section>

        {/* Popular section */}
        <section className="lang-section">
          <h2 className="lang-section-title">⭐ Popular</h2>
          <div className="anime-grid">
            {popular.map((anime) => (
              <AnimeCard key={anime.id} {...anime} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
