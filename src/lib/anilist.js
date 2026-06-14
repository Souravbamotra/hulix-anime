const ANILIST_URL = "https://graphql.anilist.co";

async function fetchFromAniList(query, variables = {}) {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 }, // Cache responses for 1 hour
    });
    
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
