'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const POPULAR_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

export default function GenreFilterBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeGenre = searchParams.get('genre');

  return (
    <div className="genre-filter-bar scrollbar-hide">
      <Link
        href={pathname}
        scroll={false}
        className={`genre-pill${!activeGenre ? ' genre-pill-active' : ''}`}
      >
        All
      </Link>
      {POPULAR_GENRES.map((genre) => (
        <Link
          key={genre}
          href={`${pathname}?genre=${encodeURIComponent(genre)}`}
          scroll={false}
          className={`genre-pill${activeGenre === genre ? ' genre-pill-active' : ''}`}
        >
          {genre}
        </Link>
      ))}
    </div>
  );
}
