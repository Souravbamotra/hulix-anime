import { getTrending, getPopular } from '@/lib/anilist';
import AnimeCard from '@/components/AnimeCard';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Suspense } from 'react';

const LANGUAGE_CONFIG = {
  hindi:          { label: 'Hindi Dubbed',   flag: '🇮🇳', source: 'RareAnimes', sourceUrl: 'https://rareanimes.mov' },
  'english-sub':  { label: 'English Subbed', flag: '🌐', source: '9Anime',    sourceUrl: 'https://9anime.org.lv'  },
  'english-dub':  { label: 'English Dubbed', flag: '🎙️', source: '9Anime',    sourceUrl: 'https://9anime.org.lv'  },
};

export const unstable_instant = {
  prefetch: 'runtime',
  samples: [
    { params: { lang: 'hindi' } }
  ],
  unstable_disableValidation: true
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

function LanguagePageSkeleton() {
  return (
    <main className="main-container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
      {/* Hero Banner */}
      <div className="lang-hero skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 24 }} />
      
      {/* Language switcher */}
      <div className="lang-switch-row skeleton" style={{ height: 40, borderRadius: 24, marginBottom: 32 }} />

      {/* Trending section */}
      <section className="lang-section">
        <h2 className="lang-section-title">🔥 Trending</h2>
        <div className="anime-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card skeleton" style={{ aspectRatio: "11/16", borderRadius: 12, height: "100%" }} />
          ))}
        </div>
      </section>
    </main>
  );
}

async function LanguagePageContent({ params }) {
  const { lang } = await params;
  const config = LANGUAGE_CONFIG[lang];

  if (!config) {
    return (
      <div className="lang-not-found" style={{ textAlign: "center", padding: "80px 24px" }}>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)", marginBottom: 16 }}>Unknown language: &ldquo;{lang}&rdquo;</p>
        <Link href="/" className="glow-btn">Go Home</Link>
      </div>
    );
  }

  const [trending, popular] = await Promise.all([
    getTrending(1, 12).catch(() => []),
    getPopular(1, 12).catch(() => []),
  ]);

  return (
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
  );
}

export default function LanguagePage({ params }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LanguagePageSkeleton />}>
        <LanguagePageContent params={params} />
      </Suspense>
    </>
  );
}
