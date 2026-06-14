"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const graphqlQuery = `
          query ($search: String) {
            Page(page: 1, perPage: 5) {
              media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  medium
                }
                format
                seasonYear
              }
            }
          }
        `;

        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { search: query },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.data.Page.media || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link href="/" className="logo-link">
          <span className="logo-highlight">Hulix</span>
          <span className="logo-sub">Anime</span>
        </Link>

        <nav className="nav-menu">
          <Link href="/" className="nav-item">Home</Link>
          <Link href="/search?q=trending" className="nav-item">Trending</Link>
          <Link href="/search?q=popular" className="nav-item">Popular</Link>
        </nav>

        <div className="search-wrapper" ref={dropdownRef}>
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="Search anime..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {isOpen && (query.trim().length >= 3) && (
            <div className="suggestions-dropdown glass-panel">
              {loading && <div className="suggestion-status">Searching...</div>}
              {!loading && suggestions.length === 0 && (
                <div className="suggestion-status">No results found</div>
              )}
              {!loading && suggestions.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  onClick={() => setIsOpen(false)}
                  className="suggestion-item"
                >
                  <Image
                    src={anime.coverImage.medium}
                    alt={anime.title.english || anime.title.romaji}
                    className="suggestion-thumb"
                    width={36}
                    height={48}
                  />
                  <div className="suggestion-info">
                    <div className="suggestion-title">
                      {anime.title.english || anime.title.romaji}
                    </div>
                    <div className="suggestion-meta">
                      {anime.format || "TV"} • {anime.seasonYear || "N/A"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
