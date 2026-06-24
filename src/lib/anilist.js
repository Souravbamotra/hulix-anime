'use cache';

const ANILIST_URL = "https://graphql.anilist.co";

// ─── Request Deduplication ──────────────────────────────────────────────────
// If 50 users request getTrending() simultaneously, only ONE fetch fires.
// All callers await the same Promise. Entries are cleared after resolution.
const inflightRequests = new Map(); // queryHash → Promise

function getQueryHash(query, variables) {
  // Simple hash from query + variables to deduplicate identical requests
  return `${query.replace(/\s+/g, " ").trim()}::${JSON.stringify(variables)}`;
}

// ─── Token Bucket Rate Limiter ──────────────────────────────────────────────
// AniList allows 90 req/min. We cap at 80 to stay safely under.
const RATE_LIMIT = {
  maxTokens: 80,
  tokens: 80,
  refillRate: 80 / 60, // tokens per second
  lastRefill: Date.now(),
};

function consumeToken() {
  const now = Date.now();
  const elapsed = (now - RATE_LIMIT.lastRefill) / 1000;
  RATE_LIMIT.tokens = Math.min(RATE_LIMIT.maxTokens, RATE_LIMIT.tokens + elapsed * RATE_LIMIT.refillRate);
  RATE_LIMIT.lastRefill = now;

  if (RATE_LIMIT.tokens >= 1) {
    RATE_LIMIT.tokens -= 1;
    return true;
  }
  return false;
}

async function waitForToken() {
  while (!consumeToken()) {
    // Wait 100ms and retry
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// ─── Core Fetch with Retry + Rate Limiting ──────────────────────────────────

async function fetchFromAniList(query, variables = {}) {
  const queryHash = getQueryHash(query, variables);

  // Deduplication: return existing in-flight promise if available
  if (inflightRequests.has(queryHash)) {
    return inflightRequests.get(queryHash);
  }

  const promise = _fetchFromAniListInternal(query, variables);
  inflightRequests.set(queryHash, promise);

  try {
    return await promise;
  } finally {
    inflightRequests.delete(queryHash);
  }
}

async function _fetchFromAniListInternal(query, variables, retries = 3) {
  try {
    // Wait for rate limit token before firing request
    await waitForToken();

    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 7200 }, // Cache responses for 2 hours (increased from 1h)
    });

    // Handle rate limiting with exponential backoff
    if (res.status === 429 && retries > 0) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
      const backoffMs = Math.min(retryAfter * 1000, 30000); // Cap at 30 seconds
      console.warn(`[AniList] Rate limited (429). Retrying in ${backoffMs}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return _fetchFromAniListInternal(query, variables, retries - 1);
    }
    
    if (!res.ok) {
      throw new Error(`AniList API returned status ${res.status}`);
    }
    
    const data = await res.json();
    if (data.errors) {
      console.error("AniList errors:", data.errors);
      throw new Error(data.errors[0].message);
    }
    return data.data;
  } catch (error) {
    // Retry on network errors
    if (retries > 0 && error.name !== "AbortError") {
      const backoffMs = (4 - retries) * 1000; // 1s, 2s, 3s
      console.warn(`[AniList] Request failed: ${error.message}. Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return _fetchFromAniListInternal(query, variables, retries - 1);
    }
    console.error("Error fetching from AniList:", error);
    return null;
  }
}

const MEDIA_FRAGMENT = `
  id
  title {
    romaji
    english
    native
  }
  coverImage {
    extraLarge
    large
    color
  }
  bannerImage
  description
  genres
  episodes
  status
  averageScore
  season
  seasonYear
  format
`;

export async function getTrending(page = 1, perPage = 10) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function getPopular(page = 1, perPage = 10) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function getTopAiring(page = 1, perPage = 10) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
          ${MEDIA_FRAGMENT}
          nextAiringEpisode {
            episode
            timeUntilAiring
          }
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function searchAnime(keyword, page = 1, perPage = 24) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          hasNextPage
        }
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { search: keyword, page, perPage });
  return data?.Page || { media: [], pageInfo: { hasNextPage: false } };
}

export async function getAnimeDetails(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        genres
        episodes
        status
        averageScore
        season
        seasonYear
        format
        duration
        idMal
        studios(isMain: true) {
          nodes {
            name
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
        recommendations(sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              format
              averageScore
            }
          }
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { id: parseInt(id) });
  return data?.Media || null;
}

export async function getAnimeByGenre(genre, page = 1, perPage = 24, sort = 'POPULARITY_DESC') {
  const query = `
    query ($genre: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
          currentPage
          total
        }
        media(genre: $genre, type: ANIME, sort: $sort, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const data = await fetchFromAniList(query, { genre, page, perPage, sort: [sort] });
  return {
    media:    data?.Page?.media    || [],
    pageInfo: data?.Page?.pageInfo || { hasNextPage: false, currentPage: page, total: 0 },
  };
}

export async function getAllGenres() {
  const query = `
    query {
      GenreCollection
    }
  `;
  const data = await fetchFromAniList(query, {});
  return data?.GenreCollection || [];
}

export async function getSearchSuggestions(keyword) {
  const query = `
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
  const data = await fetchFromAniList(query, { search: keyword });
  return data?.Page?.media || [];
}

export async function getExactSearchCount(keyword) {
  if (!keyword || !keyword.trim()) return 0;
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 100) {
        media(search: $search, type: ANIME) {
          id
        }
      }
    }
  `;
  try {
    const data = await fetchFromAniList(query, { search: keyword });
    return data?.Page?.media?.length || 0;
  } catch (error) {
    console.error("Error fetching exact search count:", error);
    return 0;
  }
}


