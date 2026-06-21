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
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);
  const headerRef = useRef(null);
  const router = useRouter();
  const [prevQuery, setPrevQuery] = useState("");

  if (query !== prevQuery) {
    setPrevQuery(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    if (query.trim().length < 3) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query.trim())}`);

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
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
      setMobileMenuOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="navbar-header" ref={headerRef}>
      <div className="navbar-container">
        <Link href="/" className="logo-link" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-highlight">Hulix</span>
          <span className="logo-sub">Anime</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <div className={`navbar-responsive-menu ${mobileMenuOpen ? "open" : ""}`}>
          <nav className="nav-menu">
            <Link href="/" className="nav-item" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="/search?q=trending" className="nav-item" onClick={() => setMobileMenuOpen(false)}>Trending</Link>
            <Link href="/search?q=popular" className="nav-item" onClick={() => setMobileMenuOpen(false)}>Popular</Link>
            <Link href="/history" className="nav-item" onClick={() => setMobileMenuOpen(false)}>History</Link>

            {/* Languages dropdown */}
            <div className="nav-dropdown-wrapper" ref={langRef}>
              <button
                className={`nav-dropdown-trigger${langOpen ? ' open' : ''}`}
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-haspopup="true"
              >
                Languages
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {langOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  <Link href="/languages/hindi"       className="nav-dropdown-item" onClick={() => { setLangOpen(false); setMobileMenuOpen(false); }}>🇮🇳 Hindi Dubbed</Link>
                  <div className="nav-dropdown-divider" />
                  <Link href="/languages/english-sub" className="nav-dropdown-item" onClick={() => { setLangOpen(false); setMobileMenuOpen(false); }}>🌐 English Sub</Link>
                  <Link href="/languages/english-dub" className="nav-dropdown-item" onClick={() => { setLangOpen(false); setMobileMenuOpen(false); }}>🎙️ English Dub</Link>
                </div>
              )}
            </div>
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
                    onClick={() => { setIsOpen(false); setMobileMenuOpen(false); }}
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
      </div>
    </header>
  );
}
