import Link from "next/link";
import Image from "next/image";

export default function AnimeCard({ id, title, coverImage, averageScore, format, episodes, description, genres }) {
  const displayTitle = title.english || title.romaji;
  
  // Format rating out of 10
  const rating = averageScore ? (averageScore / 10).toFixed(1) : null;
  
  const cleanDesc = description
    ? description
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "No description available.";
    
  const displayedGenres = genres ? genres.slice(0, 3) : [];

  return (
    <Link href={`/anime/${id}`} className="anime-card-link">
      <div className="glass-card anime-card">
        <div className="card-image-wrapper">
          <Image
            src={coverImage.large || coverImage.extraLarge}
            alt={displayTitle}
            className="card-image"
            fill
            sizes="(max-width: 640px) 140px, 180px"
          />
          {rating && (
            <div className="card-rating-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="star-icon">
                <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/>
              </svg>
              <span>{rating}</span>
            </div>
          )}
          
          <div className="card-format-badge">
            {format || "TV"}
          </div>

          {/* Hover reveal overlay */}
          <div className="card-hover-overlay">
            <div className="hover-genres">
              {displayedGenres.map(g => (
                <span key={g} className="hover-genre-tag">{g}</span>
              ))}
            </div>
            <p className="hover-desc">{cleanDesc}</p>
            <div className="hover-action-text">
              <span>Watch Now</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="play-icon-mini">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="card-details">
          <h3 className="card-title" title={displayTitle}>
            {displayTitle}
          </h3>
          <div className="card-meta">
            {episodes ? `${episodes} Eps` : "Ongoing"}
          </div>
        </div>
      </div>
    </Link>
  );
}
