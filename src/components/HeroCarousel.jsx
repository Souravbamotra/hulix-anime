"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HeroCarousel({ animeList }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (animeList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % animeList.length);
    }, 6000); // Change slide every 6s
    return () => clearInterval(timer);
  }, [animeList]);

  if (!animeList || animeList.length === 0) return null;

  const current = animeList[activeIndex];
  const title = current.title.english || current.title.romaji;
  
  // Format description
  const cleanDescription = current.description
    ? current.description.replace(/<[^>]*>/g, "") // strip HTML tags
    : "";

  return (
    <section className="hero-section">
      {/* Background Banner Layer */}
      <div className="hero-banner-container">
        {animeList.map((anime, idx) => (
          <div
            key={anime.id}
            className={`hero-banner-slide ${idx === activeIndex ? "active" : ""}`}
          >
            <Image
              src={anime.bannerImage || anime.coverImage.extraLarge}
              alt={anime.title.english || anime.title.romaji}
              fill
              priority={idx === 0}
              style={{ objectFit: "cover", objectPosition: "center 20%" }}
            />
            <div
              className="hero-banner-overlay"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "linear-gradient(to right, rgba(8, 7, 15, 0.95) 20%, rgba(8, 7, 15, 0.4) 60%, rgba(8, 7, 15, 0.95) 100%), linear-gradient(to bottom, rgba(8, 7, 15, 0.3), rgba(8, 7, 15, 0.95))",
                zIndex: 1,
              }}
            />
          </div>
        ))}
      </div>

      {/* Content Overlay Panel */}
      <div className="hero-content main-container">
        <div className="hero-text-panel glass-panel">
          <div className="hero-tag">#SPOTLIGHT {activeIndex + 1}</div>
          <h1 className="hero-title">{title}</h1>
          
          <div className="hero-meta">
            {current.averageScore && (
              <span className="hero-score-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="star-icon">
                  <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/>
                </svg>
                {(current.averageScore / 10).toFixed(1)}
              </span>
            )}
            <span className="hero-format">{current.format || "TV"}</span>
            <span className="hero-year">{current.seasonYear}</span>
          </div>

          <p className="hero-desc">{cleanDescription}</p>

          <div className="hero-genres">
            {current.genres?.slice(0, 3).map((genre) => (
              <span key={genre} className="genre-tag">{genre}</span>
            ))}
          </div>

          <div className="hero-actions">
            <Link href={`/anime/${current.id}`} className="glow-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Now
            </Link>
            <Link href={`/anime/${current.id}`} className="glow-btn-secondary">
              Details
            </Link>
          </div>
        </div>
      </div>

      {/* Carousel Dots */}
      <div className="carousel-dots">
        {animeList.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`dot-indicator ${idx === activeIndex ? "active" : ""}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
