"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

function PathnameTrackerInner() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.currentPathname && window.currentPathname !== pathname) {
        window.prevPathname = window.currentPathname;
      }
      window.currentPathname = pathname;
    }
  }, [pathname]);

  return null;
}

function PathnameTracker() {
  return (
    <Suspense fallback={null}>
      <PathnameTrackerInner />
    </Suspense>
  );
}

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Index of the keyboard-highlighted suggestion (-1 = none)
  const [activeIndex, setActiveIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const langRef = useRef(null);
  const headerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);
  const router = useRouter();

  // ── Close dropdowns on outside click ──────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
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

  // ── Debounced suggestions fetch ────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ── Shared close-and-clear helper ────────────────────────────────────
  const closeAndNavigate = useCallback((href) => {
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery("");
    setMobileMenuOpen(false);
    router.push(href);
  }, [router]);

  // ── Keyboard navigation ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, suggestions.length - 1);
          // Scroll highlighted item into view
          listboxRef.current
            ?.children[next]
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, -1);
          if (next >= 0) {
            listboxRef.current
              ?.children[next]
              ?.scrollIntoView({ block: "nearest" });
          }
          return next;
        });
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        if (selected) {
          closeAndNavigate(`/anime/${selected.id}`);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [isOpen, suggestions, activeIndex, closeAndNavigate]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // If the user highlighted a suggestion with the keyboard, pick it
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        closeAndNavigate(`/anime/${suggestions[activeIndex].id}`);
      } else {
        setIsOpen(false);
        setMobileMenuOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const showDropdown = isOpen && query.trim().length >= 3;
  const listboxId = "search-suggestions-listbox";

  return (
    <header className="navbar-header" ref={headerRef}>
      <PathnameTracker />
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
            <Link href="/watchlist" className="nav-item" onClick={() => setMobileMenuOpen(false)}>My List</Link>

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

          {/* ── Search ─────────────────────────────────────────────────── */}
          <div className="search-wrapper" ref={dropdownRef}>
            <form
              onSubmit={handleSearchSubmit}
              className="search-form"
              role="search"
            >
              <input
                ref={inputRef}
                id="navbar-search-input"
                type="text"
                placeholder="Search anime..."
                value={query}
                autoComplete="off"
                aria-label="Search anime"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={showDropdown}
                aria-activedescendant={
                  activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
                }
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="search-input"
              />
              <button
                type="submit"
                className={`search-btn ${loading ? "search-btn--loading" : ""}`}
                aria-label="Submit search"
              >
                {loading ? (
                  <span className="search-spinner" aria-hidden="true" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </form>

            {/* ── Autocomplete Dropdown ─────────────────────────────── */}
            {showDropdown && (
              <div
                id={listboxId}
                ref={listboxRef}
                className="suggestions-dropdown glass-panel"
                role="listbox"
                aria-label="Search suggestions"
              >
                {!loading && suggestions.length === 0 && (
                  <div className="suggestion-status" role="status">
                    No results found
                  </div>
                )}

                {suggestions.map((anime, idx) => {
                  const isActive = idx === activeIndex;
                  const title = anime.title.english || anime.title.romaji;
                  return (
                    <div
                      key={anime.id}
                      id={`suggestion-${idx}`}
                      role="option"
                      aria-selected={isActive}
                      className={`suggestion-item${isActive ? " suggestion-item--active" : ""}`}
                      /* mousedown fires before blur so we can read the target */
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep focus on input so keydown still works
                        closeAndNavigate(`/anime/${anime.id}`);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <Image
                        src={anime.coverImage.medium}
                        alt={title}
                        className="suggestion-thumb"
                        width={36}
                        height={48}
                      />
                      <div className="suggestion-info">
                        <div className="suggestion-title">{title}</div>
                        <div className="suggestion-meta">
                          {anime.format || "TV"} • {anime.seasonYear || "N/A"}
                        </div>
                      </div>
                      {/* Keyboard-hint badge when this row is active */}
                      {isActive && (
                        <span className="suggestion-enter-hint" aria-hidden="true">
                          ↵
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

