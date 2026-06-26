import * as cheerio from "cheerio";
import dns from "node:dns";
import { getCacheKey, getCache, setCache } from "./cache.js";
import {
  COMBINE_SEASONS_WHITELIST,
  RAREANIMES_SEASON_OFFSETS,
  DORAEMON_MOVIE_MAP,
  getGogoAnimeOverride,
  getRareAnimesOverrideBeforeCache,
  getRareAnimesOverrideAfterCache,
  getAniListSeasonNum,
  getDoraemonEnglishTitle
} from "./mappings.js";

const LONG_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days


// Force Node.js DNS to prefer IPv4 first to avoid DNS/IPv6 timeouts
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// ─── In-Flight Request Deduplication ─────────────────────────────────────────
const inflightRequests = new Map(); // key → Promise

async function deduplicateRequest(key, fetchFn) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }
  const promise = fetchFn();
  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
}

const GOGOANIME_URL = "https://9anime.org.lv";

// Helper to sanitize title for matching
function sanitizeTitle(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // remove special chars except spaces/hyphens
    .replace(/\s+/g, " ")     // replace multiple spaces with single space
    .trim();
}

// Simple similarity check
function computeSimilarity(titleA, titleB) {
  const cleanA = sanitizeTitle(titleA);
  const cleanB = sanitizeTitle(titleB);
  
  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.8;
  
  const wordsA = new Set(cleanA.split(" "));
  const wordsB = new Set(cleanB.split(" "));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  
  return intersection.size / Math.max(wordsA.size, wordsB.size);
}

// Helper to generate search query variations for WordPress/search endpoints
function getSearchQueries(romaji, english) {
  const queries = [];
  
  if (romaji) queries.push(romaji);
  if (english) queries.push(english);
  
  if (romaji) {
    if (romaji.includes(":")) queries.push(romaji.split(":")[0].trim());
    if (romaji.includes("-")) queries.push(romaji.split("-")[0].trim());
  }
  if (english) {
    if (english.includes(":")) queries.push(english.split(":")[0].trim());
    if (english.includes("-")) queries.push(english.split("-")[0].trim());
  }
  
  return [...new Set(queries)].filter(Boolean);
}

// Verification helper to ensure we don't map to a completely different sub-series or incorrect release year.
function verifyTitleMatch(aniListTitle, searchResultTitle, seasonYear = null) {
  if (!aniListTitle || !searchResultTitle) return false;
  
  const cleanAniList = sanitizeTitle(aniListTitle);
  const cleanResult = sanitizeTitle(searchResultTitle);
  
  const wordsAniList = cleanAniList.split(/\s+/).filter(Boolean);
  const wordsResult = cleanResult.split(/\s+/).filter(Boolean);
  
  const setAniList = new Set(wordsAniList);
  const setResult = new Set(wordsResult);
  
  const ignorableWords = new Set([
    "hindi", "english", "tamil", "telugu", "bengali", "malayalam", "audio", "multi", "dubbed", "dub", "subbed", "sub",
    "season", "seasons", "series", "episodes", "episode", "ep", "download", "hd", "fhd", "complete", "all",
    "movie", "movies", "film", "films", "ova", "ovas", "special", "specials", "uncut", "uncensored", "censored",
    "pack", "full", "collection", "dual", "org", "original", "bluray", "brrip", "webrip", "classic", "version",
    "jio", "cinema", "crunchyroll", "netflix", "disney", "hotstar", "bilibili"
  ]);
  
  // 1. Franchise sub-series word strict verification
  // If one title specifies a sub-series keyword (e.g. "daima", "super", "gt", "kai", "heroes", "shippuden", "boruto", "z")
  // then the other title MUST also contain it.
  const franchiseSubSeries = new Set([
    "daima", "super", "gt", "kai", "heroes", "shippuden", "boruto", "z"
  ]);
  
  for (const word of franchiseSubSeries) {
    const inAniList = setAniList.has(word);
    const inResult = setResult.has(word);
    if (inAniList !== inResult) {
      return false;
    }
  }
  
  // 2. Year mismatch check (if year is present in both)
  if (seasonYear) {
    const yearMatch = cleanResult.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      const resultYear = parseInt(yearMatch[1], 10);
      if (Math.abs(resultYear - seasonYear) > 1) {
        return false;
      }
    }
  }
  
  // 3. Ensure search result key words are subset of the AniList key words
  const mismatches = [];
  for (const word of wordsResult) {
    if (ignorableWords.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    if (!setAniList.has(word)) {
      mismatches.push(word);
    }
  }
  
  if (mismatches.length > 0) {
    return false;
  }
  
  return true;
}

function verifyTitleMatchForAny(titleRomaji, titleEnglish, searchResultTitle, seasonYear = null) {
  const matchRomaji = titleRomaji ? verifyTitleMatch(titleRomaji, searchResultTitle, seasonYear) : false;
  const matchEnglish = titleEnglish ? verifyTitleMatch(titleEnglish, searchResultTitle, seasonYear) : false;
  return matchRomaji || matchEnglish;
}

export async function searchGogoAnime(keyword) {
  const reqKey = `search_gogo:${keyword}`;
  return deduplicateRequest(reqKey, () => searchGogoAnimeUncached(keyword));
}

async function searchGogoAnimeUncached(keyword) {
  try {
    const url = `${GOGOANIME_URL}/?s=${encodeURIComponent(keyword)}`;
    console.log(`[Scraper] Searching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[Scraper] Search fetch failed with status: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    
    // Parse WordPress DramaStream theme cards + new ul.items structure
    $("article, .listupd .bs, ul.items li").each((i, element) => {
      const aTag = $(element).find("a").first();
      const href = aTag.attr("href");
      
      if (href && (href.includes("/series/") || href.includes("/anime/"))) {
        const title = $(element).find(".tt").text().trim() || $(element).find(".name").text().trim() || aTag.attr("title") || aTag.text().trim();
        const image = $(element).find("img").attr("src") || $(element).find("img").attr("data-src");
        
        const slug = href.replace(`${GOGOANIME_URL}/`, "").replace(/\/$/, "");
        results.push({ title, slug, image, released: "" });
      }
    });
    
    console.log(`[Scraper] Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.warn("[Scraper] Error in searchGogoAnime:", error.message || error);
    return [];
  }
}

async function checkSlugExists(slug) {
  try {
    const url = `${GOGOANIME_URL}/${slug}/`;
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

export async function findGogoAnimeSlug(aniListTitleRomaji, aniListTitleEnglish, format = "", isDub = false, seasonYear = null) {
  if (!aniListTitleEnglish && aniListTitleRomaji) {
    const fallbackEnglish = getDoraemonEnglishTitle(aniListTitleRomaji);
    if (fallbackEnglish) {
      aniListTitleEnglish = fallbackEnglish;
    }
  }
  const cacheKey = getCacheKey("gogo_slug", `${aniListTitleRomaji}_${aniListTitleEnglish}_${isDub}`);
  const cached = await getCache(cacheKey, LONG_CACHE_TTL);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey, LONG_CACHE_TTL);
    if (doubleCheck) return doubleCheck;
    
    const result = await findGogoAnimeSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format, isDub, seasonYear);
    if (result) {
      await setCache(cacheKey, result, LONG_CACHE_TTL);
    }
    return result;
  });
}

// Maps AniList titles to Gogoanime/9anime slug
async function findGogoAnimeSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format = "", isDub = false, seasonYear = null) {
  const override = getGogoAnimeOverride(aniListTitleRomaji, aniListTitleEnglish, isDub);
  if (override) return override;

  const searchQueries = getSearchQueries(aniListTitleRomaji, aniListTitleEnglish);
  
  for (const query of searchQueries) {
    const results = await searchGogoAnime(isDub ? `${query} (Dub)` : query);
    if (results.length > 0) {
      let bestMatch = null;
      let highestScore = 0;
      
      for (const result of results) {
        // Clean title from "(Dub)" suffix for similarity matching
        const cleanTitle = result.title.replace(/\s*\(Dub\)$/i, "").replace(/\s+/g, " ").trim();
        
        // Strict Title & Year Verification
        if (!verifyTitleMatchForAny(aniListTitleRomaji, aniListTitleEnglish, cleanTitle, seasonYear)) {
          continue;
        }
        
        const scoreRomaji = computeSimilarity(cleanTitle, aniListTitleRomaji);
        const scoreEnglish = aniListTitleEnglish ? computeSimilarity(cleanTitle, aniListTitleEnglish) : 0;
        let score = Math.max(scoreRomaji, scoreEnglish);
        
        // Apply TV/Movie format adjustments
        const lowerTitle = result.title.toLowerCase();
        const isMovie = format === "MOVIE";
        const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("-movie");
        
        if (isMovie) {
          if (titleHasMovie) score += 0.15;
        } else {
          if (titleHasMovie) score -= 0.3;
        }
        
        // Check if result matches the requested Dub status
        const isResultDub = lowerTitle.includes("(dub)") || result.slug.includes("-dub");
        if (isDub && !isResultDub) score -= 0.5;
        if (!isDub && isResultDub) score -= 0.5;
        
        if (score > highestScore && score > 0.4) {
          highestScore = score;
          bestMatch = result.slug;
        }
      }
      
      // If we found an exact/very high confidence match, return it
      if (bestMatch && highestScore >= 0.95) {
        console.log(`[Scraper] Mapped to (isDub=${isDub}): ${bestMatch} with high confidence`);
        return bestMatch;
      }

      // If match score is sub-optimal (e.g. 0.8), verify if the fallback slug exists
      // as it might be the main series pushed off page 1 of search results.
      const fallbackSlugs = [];
      if (aniListTitleRomaji) {
        let slug = "anime/" + aniListTitleRomaji.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (isDub) slug += "-dub";
        fallbackSlugs.push(slug);
      }
      if (aniListTitleEnglish) {
        let slug = "anime/" + aniListTitleEnglish.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (isDub) slug += "-dub";
        if (!fallbackSlugs.includes(slug)) fallbackSlugs.push(slug);
      }

      for (const fallbackSlug of fallbackSlugs) {
        const exists = await checkSlugExists(fallbackSlug);
        if (exists) {
          console.log(`[Scraper] Fallback slug verified & chosen: ${fallbackSlug}`);
          return fallbackSlug;
        }
      }

      if (bestMatch) {
        console.log(`[Scraper] Mapped to (isDub=${isDub}): ${bestMatch}`);
        return bestMatch;
      }
    }
  }
  
  // Fallback: search with a simplified slug of the Romaji title
  if (aniListTitleRomaji) {
    let fallbackSlug = "anime/" + aniListTitleRomaji.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (isDub) fallbackSlug += "-dub";
    return fallbackSlug;
  }
  
  return null;
}


export async function getAnimeEpisodes(slug) {
  if (!slug || slug === "no_slug" || slug === "none") return [];
  const cacheKey = getCacheKey("gogo_eps", slug);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    const result = await getAnimeEpisodesUncached(slug);
    if (result && result.length > 0) {
      await setCache(cacheKey, result);
    }
    return result;
  });
}

/**
 * Scrape the episode list from a Gogoanime series page.
 */
async function getAnimeEpisodesUncached(slug) {
  try {
    const url = `${GOGOANIME_URL}/${slug}/`;
    console.log(`[Scraper] Fetching episodes list from: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[Scraper] Episodes fetch failed with status ${res.status} for slug: ${slug}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // AnimeStream eplister support
    if ($(".eplister").length > 0) {
      const episodes = [];
      $(".eplister ul li a").each((i, el) => {
        const href = $(el).attr("href") || "";
        const numText = $(el).find(".epl-num").text().trim();
        const num = parseFloat(numText) || episodes.length + 1;
        const epSlug = href.replace(`${GOGOANIME_URL}/`, "").replace(/\/$/, "");
        episodes.push({ number: num, slug: epSlug });
      });
      const sorted = episodes.sort((a, b) => a.number - b.number);
      console.log(`[Scraper] Parsed ${sorted.length} episodes via eplister`);
      return sorted;
    }
    
    // Check if episodes are loaded via AJAX (movie_id + nonce)
    const movieId = $("#movie_id").val();
    const nonceMatch = html.match(/nonce:\s*['"]([^'"]+)['"]/);
    const nonce = nonceMatch ? nonceMatch[1] : null;
    
    if (movieId && nonce) {
      const formData = new URLSearchParams();
      formData.append("action", "load_episode_range");
      formData.append("range_start", "1");
      formData.append("range_end", "9999");
      formData.append("seri_id", movieId);
      formData.append("nonce", nonce);

      const ajaxRes = await fetch(`${GOGOANIME_URL}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });
      
      const ajaxData = await ajaxRes.json();
      if (ajaxData.success && ajaxData.data) {
        const ep$ = cheerio.load(ajaxData.data);
        const episodes = [];
        ep$("a").each((i, el) => {
          const href = ep$(el).attr("href") || "";
          const text = ep$(el).find(".name").text().trim() || ep$(el).text().trim();
          const epSlug = href.replace(`${GOGOANIME_URL}/`, "").replace(/\/$/, "");
          const numMatch = text.match(/EP\s*(\d+(\.\d+)?)/i) || epSlug.match(/-episode-(\d+(\.\d+)?)/i);
          const num = numMatch ? parseFloat(numMatch[1]) : episodes.length + 1;
          episodes.push({ number: num, slug: epSlug });
        });
        
        const sorted = episodes.sort((a, b) => a.number - b.number);
        console.log(`[Scraper] Parsed ${sorted.length} episodes via AJAX`);
        return sorted;
      }
    }
    
    const episodes = [];
    
    // Fallback: older HTML structure
    $(".episode-item[data-episode-number]").each((i, el) => {
      const epNum = parseFloat($(el).attr("data-episode-number"));
      const aTag = $(el).find("a").first();
      const href = aTag.attr("href") || "";
      
      if (href) {
        const epSlug = href.replace(`${GOGOANIME_URL}/`, "").replace(/\/$/, "");
        episodes.push({ number: epNum, slug: epSlug });
      }
    });
    
    if (episodes.length === 0) {
      $("a").each((i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        
        if (href.includes("-episode-") && text.toLowerCase().includes("episode")) {
          const numberMatch = text.match(/episode\s*(\d+(\.\d+)?)/i);
          const num = numberMatch ? parseFloat(numberMatch[1]) : episodes.length + 1;
          const epSlug = href.replace(`${GOGOANIME_URL}/`, "").replace(/\/$/, "");
          
          episodes.push({ number: num, slug: epSlug });
        }
      });
    }
    
    const seen = new Set();
    const uniqueEpisodes = [];
    for (const ep of episodes) {
      if (!seen.has(ep.slug)) {
        seen.add(ep.slug);
        uniqueEpisodes.push(ep);
      }
    }
    
    const sorted = uniqueEpisodes.sort((a, b) => a.number - b.number);
    console.log(`[Scraper] Parsed ${sorted.length} episodes`);
    return sorted;
  } catch (error) {
    console.warn("[Scraper] Error in getAnimeEpisodes:", error.message || error);
    return [];
  }
}

export async function getEpisodeServers(episodeSlug) {
  const cacheKey = getCacheKey("ep_servers", episodeSlug);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    const result = await getEpisodeServersUncached(episodeSlug);
    if (result && result.servers && result.servers.length > 0) {
      await setCache(cacheKey, result);
    }
    return result;
  });
}

async function resolveTrueEmbedUrl(url) {
  if (!url) return url;
  if (url.includes("codedew.com") || url.includes("multiquality")) {
    try {
      console.log(`[Scraper] Resolving true embed player URL for: ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        let iframeUrl = $("iframe").first().attr("src");
        if (!iframeUrl) {
          const match = html.match(/https?:\/\/argon\.razorshell\.space\/embed\/[a-zA-Z0-9]+/);
          if (match) iframeUrl = match[0];
        }
        if (iframeUrl) {
          if (iframeUrl.startsWith("//")) {
            iframeUrl = `https:${iframeUrl}`;
          }
          console.log(`[Scraper] Resolved true embed URL: ${iframeUrl}`);
          return iframeUrl;
        }
      }
    } catch (e) {
      console.warn("[Scraper] Failed to resolve true embed URL:", e.message);
    }
  }
  return url;
}

/**
 * Scrape all available streaming servers
 */
async function getEpisodeServersUncached(episodeSlug) {
  try {
    if (episodeSlug.startsWith("anidap-")) {
      const parts = episodeSlug.split("-");
      const malId = parts[1];
      const epNum = parts[2];
      const type = parts[3] || "sub";
      
      const server = {
        category: type,
        name: "AniDap",
        type: "embed",
        iframeUrl: `https://anidap.se/watch?id=${malId}&ep=${epNum}&type=${type}`,
        sourceType: "hls"
      };
      
      return {
        servers: [server],
        defaultServer: server
      };
    }

    if (episodeSlug.startsWith("toonstream-")) {
      const pagePath = episodeSlug.replace("toonstream-", "").replace(/__/g, "/");
      const url = `https://toonstream.vip/${pagePath}/`;
      console.log(`[ToonStream] Fetching servers from: ${url}`);
      
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
      });
      
      if (!res.ok) {
        console.warn(`[ToonStream] Servers fetch failed with status ${res.status} for episode: ${episodeSlug}`);
        return { servers: [], defaultServer: null };
      }
      
      const html = await res.text();
      const $ = cheerio.load(html);
      
      let trid = null;
      $("iframe").each((i, el) => {
        const src = $(el).attr("src") || "";
        const match = src.match(/[\?&]trid=(\d+)/);
        if (match) {
          trid = match[1];
          return false;
        }
      });
      
      if (!trid) {
        const tridMatch = html.match(/[\?&]trid=(\d+)/) || html.match(/trid['"]?\s*:\s*['"]?(\d+)/);
        if (tridMatch) trid = tridMatch[1];
      }
      
      if (!trid) {
        console.warn(`[ToonStream] Could not resolve trid/post ID for episode: ${episodeSlug}`);
        return { servers: [], defaultServer: null };
      }
      
      console.log(`[ToonStream] Resolved trid: ${trid}`);
      
      const optionLinks = [];
      $("a[href^='#options-']").each((i, el) => {
        const href = $(el).attr("href");
        const match = href.match(/#options-(\d+)/);
        if (match) {
          const trembed = parseInt(match[1], 10);
          // Try .server child first; fall back to raw anchor text
          const serverSpan = $(el).find(".server");
          let serverName;
          if (serverSpan.length > 0) {
            serverName = serverSpan.text().trim();
          } else {
            // Text looks like "Sever 1\nX\n-Multi Audio" — grab the 2nd token
            const lines = $(el).text().trim().split(/\s*\n\s*/).filter(Boolean);
            serverName = lines[1] || lines[0] || `Server ${trembed + 1}`;
          }
          const cleanedName = serverName.split(/\s*-\s*/)[0].trim();
          optionLinks.push({ trembed, name: cleanedName });
        }
      });
      
      const resolvedServers = await Promise.all(optionLinks.map(async (opt) => {
        const embedUrl = `https://toonstream.vip/?trembed=${opt.trembed}&trid=${trid}&trtype=2`;
        try {
          const embedRes = await fetch(embedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              "Referer": "https://toonstream.vip/"
            }
          });
          if (embedRes.ok) {
            const embedHtml = await embedRes.text();
            const embed$ = cheerio.load(embedHtml);
            const iframeUrl = embed$("iframe").first().attr("src");
            if (iframeUrl) {
              return {
                category: "dub",
                name: opt.name,
                type: "embed",
                iframeUrl,
                sourceType: "iframe"
              };
            }
          }
        } catch (e) {
          console.warn(`[ToonStream] Failed to resolve trembed=${opt.trembed} for trid=${trid}:`, e.message);
        }
        return null;
      }));
      
      const activeServers = resolvedServers.filter(Boolean);
      return {
        servers: activeServers,
        defaultServer: activeServers[0] || null
      };
    }

    if (episodeSlug.startsWith("rareanimes-")) {
      const match = episodeSlug.match(/^rareanimes-(.+)-episode-(\d+(\.\d+)?)$/);
      if (!match) {
        console.warn(`[Scraper] Invalid RareAnimes episode slug: ${episodeSlug}`);
        return { servers: [], defaultServer: null };
      }
      const seriesSlug = match[1].replace(/__/g, "/");
      const episodeNumber = parseFloat(match[2]);
      
      const episodes = await getRareAnimesEpisodes(seriesSlug);
      const ep = episodes.find((e) => e.number === episodeNumber);
      if (!ep || !ep.links || ep.links.length === 0) {
        console.warn(`[Scraper] No links found for RareAnimes episode slug: ${episodeSlug}`);
        return { servers: [], defaultServer: null };
      }
      
      const servers = await Promise.all(ep.links.map(async (link) => {
        let name = link.label;
        if (name.includes("MultiQuality")) {
          name = "WatchMultiQuality";
        } else if (name.includes("Beta") || name.includes("StreamBeta")) {
          name = "StreamBeta";
        } else {
          name = name.trim();
        }
        
        // Resolve the true embed player URL (e.g. razorshell.space instead of codedew.com wrapper)
        const resolvedUrl = await resolveTrueEmbedUrl(link.href);
        
        return {
          category: "dub",
          name,
          type: "embed",
          iframeUrl: resolvedUrl,
          sourceType: "iframe",
        };
      }));
      
      return {
        servers,
        defaultServer: servers[0] || null,
      };
    }

    const url = `${GOGOANIME_URL}/${episodeSlug}/`;
    console.log(`[Scraper] Fetching servers from: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[Scraper] Servers fetch failed with status ${res.status} for episode: ${episodeSlug}`);
      return { servers: [], defaultServer: null };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const servers = [];
    
    // Detect if this is a dub episode from 9anime (slug usually contains "-dub")
    const isDubEpisode = episodeSlug.toLowerCase().includes("-dub");
    const defaultCategory = isDubEpisode ? "dub" : "sub";
    
    // Method 1: Parse from select.mirror dropdown (base64-encoded iframe HTML)
    $("select.mirror option[value]").each((i, el) => {
      const val = $(el).attr("value");
      const name = $(el).text().trim() || `Server ${i + 1}`;
      
      if (!val) return;
      
      try {
        // Decode the base64-encoded iframe HTML
        const decodedHtml = Buffer.from(val, "base64").toString("utf-8");
        const iframe$ = cheerio.load(decodedHtml);
        const iframeUrl = iframe$("iframe").attr("src") || iframe$("IFRAME").attr("SRC") || "";
        
        if (iframeUrl) {
          // Detect category from the iframe URL parameter if present
          const catMatch = iframeUrl.match(/[&?]category=(sub|dub)/i);
          const category = catMatch ? catMatch[1].toLowerCase() : defaultCategory;
          
          servers.push({
            category,
            name,
            type: "embed",
            iframeUrl: iframeUrl.startsWith("//") ? `https:${iframeUrl}` : iframeUrl,
            sourceType: "iframe",
          });
        }
      } catch (e) {
        // Not valid base64 or parsing failed, skip
      }
    });
    
    // Method 2: Parse from data-video attributes on server links (legacy)
    if (servers.length === 0) {
      $("a[data-video]").each((i, el) => {
        const videoIframeHTML = $(el).attr("data-video");
        const name = $(el).text().replace("Choose this server", "").trim() || `Server ${i + 1}`;
        
        const iframe$ = cheerio.load(videoIframeHTML);
        const iframeUrl = iframe$("iframe").attr("src");
        
        if (iframeUrl) {
          servers.push({
            category: defaultCategory,
            name,
            type: "embed",
            iframeUrl,
            sourceType: "iframe",
          });
        }
      });
    }
    
    // Method 3: Direct iframe embed in the player area
    if (servers.length === 0) {
      const playerIframe = $(".player-embed iframe, #pembed iframe").attr("src");
      if (playerIframe) {
        servers.push({
          category: defaultCategory,
          name: "Default",
          type: "embed",
          iframeUrl: playerIframe.startsWith("//") ? `https:${playerIframe}` : playerIframe,
          sourceType: "iframe",
        });
      }
    }

    // Method 4: Fallback - older HTML structure with encrypted URLs
    if (servers.length === 0) {
      const articleId = $("article").first().attr("id");
      const postId = articleId ? articleId.replace("post-", "") : "";
      
      $("#w-servers .servers .type").each((i, typeEl) => {
        const category = ($(typeEl).attr("data-type") || "sub").toLowerCase();
        
        $(typeEl).find(".player-type-link").each((j, linkEl) => {
          const $link = $(linkEl);
          const type = $link.attr("data-type") || "embed";
          const enc1 = $link.attr("data-encrypted-url1") || "";
          const enc2 = $link.attr("data-encrypted-url2") || "";
          const enc3 = $link.attr("data-encrypted-url3") || "";
          const plainUrl = $link.attr("data-plain-url") || "";
          const name = $link.text().trim() || `Server ${j + 1}`;
          
          let iframeUrl = "";
          
          if (plainUrl) {
            iframeUrl = plainUrl.startsWith("//") ? `https:${plainUrl}` : plainUrl;
          } else if (enc1) {
            const params = new URLSearchParams();
            params.set(type, enc1);
            if (enc2) params.set("url2", enc2);
            if (enc3) params.set("url3", enc3);
            params.set("ref", "gogoanimes.cv");
            if (postId) params.set("postId", postId);
            iframeUrl = `https://9animetv.be/wp-content/plugins/video-player/includes/player/player.php?${params.toString()}`;
          }
          
          if (iframeUrl) {
            servers.push({ category, name, type, iframeUrl, sourceType: "iframe" });
          }
        });
      });
    }
    
    console.log(`[Scraper] Found ${servers.length} servers`);
    
    return {
      servers,
      defaultServer: servers[0] || null,
    };
  } catch (error) {
    console.warn("[Scraper] Error in getEpisodeServers:", error.message || error);
    return { servers: [], defaultServer: null };
  }
}

// Keep legacy function for backward compat, wraps getEpisodeServers
export async function getEpisodeStreamUrl(episodeSlug) {
  const { defaultServer } = await getEpisodeServers(episodeSlug);
  if (defaultServer) {
    return {
      iframeUrl: defaultServer.iframeUrl,
      sourceType: defaultServer.sourceType,
    };
  }
  return null;
}

// --- RareAnimes (Hindi Dub) Scraper ---

export async function searchRareAnimes(keyword) {
  const reqKey = `search_rare:${keyword}`;
  return deduplicateRequest(reqKey, () => searchRareAnimesUncached(keyword));
}

async function searchRareAnimesUncached(keyword) {
  try {
    const url = `https://www.rareanimes.mov/?s=${encodeURIComponent(keyword)}`;
    console.log(`[Scraper] RareAnimes Searching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[Scraper] RareAnimes Search fetch failed with status: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $("article").each((i, element) => {
      const titleLink = $(element).find("h2.entry-title a, .entry-title a").first();
      const href = titleLink.attr("href");
      const title = titleLink.text().trim();
      const image = $(element).find(".herald-post-thumbnail img, img").first().attr("src");
      
      if (href) {
        const slug = href.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
        results.push({ title, slug, image });
      }
    });
    
    console.log(`[Scraper] RareAnimes found ${results.length} search results`);
    return results;
  } catch (error) {
    console.warn("[Scraper] Error in searchRareAnimes:", error.message || error);
    return [];
  }
}

export async function findRareAnimesSlug(aniListTitleRomaji, aniListTitleEnglish, format = "", seasonYear = null) {
  if (!aniListTitleEnglish && aniListTitleRomaji) {
    const fallbackEnglish = getDoraemonEnglishTitle(aniListTitleRomaji);
    if (fallbackEnglish) {
      aniListTitleEnglish = fallbackEnglish;
    }
  }
  const override = getRareAnimesOverrideBeforeCache(aniListTitleRomaji, aniListTitleEnglish);
  if (override) return override;

  const cacheKey = getCacheKey("rare_slug", `${aniListTitleRomaji}_${aniListTitleEnglish}`);
  const cached = await getCache(cacheKey, LONG_CACHE_TTL);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey, LONG_CACHE_TTL);
    if (doubleCheck) return doubleCheck;
    
    const result = await findRareAnimesSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format, seasonYear);
    if (result) {
      await setCache(cacheKey, result, LONG_CACHE_TTL);
    }
    return result;
  });
}

function cleanTitleForGrouping(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/\b(?:season|arc|saga|part)\s*\d+/gi, "")
    .replace(/\b(all|hindi|dubbed|episodes|download|hd|complete|series|movie|films?|pack|tamil|telugu|bengali|malayalam|english|audio|multi)\b.*/ig, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSeasonNum(title) {
  const match = title.match(/\b(?:season|arc|saga|part)\s*0*(\d+)\b/i);
  return match ? parseInt(match[1], 10) : 1;
}

async function resolveDoraemonMovieSlug(aniListTitleRomaji, aniListTitleEnglish) {
  const cleanRomaji = (aniListTitleRomaji || "").toLowerCase();
  const cleanEnglish = (aniListTitleEnglish || "").toLowerCase();
  
  const sortedKeys = Object.keys(DORAEMON_MOVIE_MAP).sort((a, b) => b.length - a.length);
  let matchedNum = null;
  
  for (const key of sortedKeys) {
    if (cleanRomaji.includes(key) || cleanEnglish.includes(key)) {
      matchedNum = DORAEMON_MOVIE_MAP[key];
      break;
    }
  }
  
  if (!matchedNum) return null;
  
  try {
    const res = await fetch("https://www.rareanimes.mov/hindi/doraemon-all-movies-hindi-dubbed-download-hd/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let zipperUrl = "";
    $(".entry-content a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const numRegex = new RegExp(`^movie\\s*${matchedNum}\\s*[:–-]`, "i");
      if (href && (numRegex.test(text) || text.toLowerCase().includes(`movie ${matchedNum}`))) {
        zipperUrl = href;
        return false; // break
      }
    });
    
    if (!zipperUrl) return null;
    
    const redirectRes = await fetch(zipperUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const finalUrl = redirectRes.url;
    const finalSlug = finalUrl.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
    console.log(`[Scraper] Mapped Doraemon Movie ${matchedNum} to slug: ${finalSlug}`);
    return finalSlug;
  } catch (err) {
    console.warn("[Scraper] Error resolving Doraemon movie slug:", err.message || err);
    return null;
  }
}

async function findRareAnimesSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format = "", seasonYear = null) {
  const cleanTitleRomaji = (aniListTitleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (aniListTitleEnglish || "").toLowerCase().trim();
  
  const isDoraemon = cleanTitleRomaji.includes("doraemon") || cleanTitleEnglish.includes("doraemon");
  const isMovie = format === "MOVIE";
  if (isDoraemon && isMovie) {
    console.log(`[Scraper] Doraemon movie detected. Resolving from compilation page...`);
    const mappedSlug = await resolveDoraemonMovieSlug(aniListTitleRomaji, aniListTitleEnglish);
    if (mappedSlug) return mappedSlug;
  }
  
  const override = getRareAnimesOverrideAfterCache(aniListTitleRomaji, aniListTitleEnglish);
  if (override) return override;

  // Check if we should combine seasons for this title (Case A)
  const shouldCombine = COMBINE_SEASONS_WHITELIST.some(title => 
    cleanTitleRomaji === title || cleanTitleEnglish === title || 
    cleanTitleRomaji.includes(title) || cleanTitleEnglish.includes(title)
  );

  const targetSeason = shouldCombine ? null : (
    getAniListSeasonNum(aniListTitleRomaji) || 
    getAniListSeasonNum(aniListTitleEnglish) || 
    1
  );

  const searchQueries = getSearchQueries(aniListTitleRomaji, aniListTitleEnglish);
  
  for (const query of searchQueries) {
    const results = await searchRareAnimes(query);
    if (results.length > 0) {
      let bestMatchResult = null;
      let highestScore = 0;
      
      for (const result of results) {
        const lowerTitle = result.title.toLowerCase();
        
        // Exclude Hindi Subbed-only pages
        const isSubbed = lowerTitle.includes("subbed") || result.slug.includes("subbed");
        const isDubbed = lowerTitle.includes("dubbed") || lowerTitle.includes("dub") || result.slug.includes("dubbed") || result.slug.includes("dub");
        if (isSubbed && !isDubbed) {
          continue;
        }

        // Strict Title & Year Verification
        if (!verifyTitleMatchForAny(aniListTitleRomaji, aniListTitleEnglish, result.title, seasonYear)) {
          continue;
        }

        const scoreRomaji = computeSimilarity(result.title, aniListTitleRomaji);
        const scoreEnglish = aniListTitleEnglish ? computeSimilarity(result.title, aniListTitleEnglish) : 0;
        let score = Math.max(scoreRomaji, scoreEnglish);
        
        const isMovie = format === "MOVIE";
        const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("-movie");
        
        if (isMovie) {
          if (titleHasMovie) score += 0.15;
        } else {
          if (titleHasMovie) score -= 0.3;
        }
        
        if (score > highestScore && (score > 0.35 || lowerTitle.includes(query.toLowerCase()))) {
          highestScore = score;
          bestMatchResult = result;
        }
      }
      
      if (bestMatchResult) {
        // Find other seasons for this anime
        const baseBestTitle = cleanTitleForGrouping(bestMatchResult.title);
        const matchedSeasons = [];
        
        for (const result of results) {
          const lowerTitle = result.title.toLowerCase();
          const isHindi = lowerTitle.includes("hindi") || result.slug.includes("hindi");
          if (!isHindi) continue; // Must be Hindi Dubbed
          
          // Exclude Hindi Subbed-only pages
          const isSubbed = lowerTitle.includes("subbed") || result.slug.includes("subbed");
          const isDubbed = lowerTitle.includes("dubbed") || lowerTitle.includes("dub") || result.slug.includes("dubbed") || result.slug.includes("dub");
          if (isSubbed && !isDubbed) {
            continue;
          }
          
          const isMovie = format === "MOVIE";
          const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("-movie");
          if (isMovie !== titleHasMovie) continue; // Match format
          
          // Strict Title & Year Verification for secondary seasons
          if (!verifyTitleMatchForAny(aniListTitleRomaji, aniListTitleEnglish, result.title, seasonYear)) {
            continue;
          }
          
          const baseResultTitle = cleanTitleForGrouping(result.title);
          if (baseResultTitle === baseBestTitle || baseResultTitle.includes(baseBestTitle) || baseBestTitle.includes(baseResultTitle)) {
            const seasonNum = getSeasonNum(result.title);
            
            // If we are NOT combining seasons, filter out non-target seasons
            if (!shouldCombine && seasonNum !== targetSeason) {
              continue;
            }
            
            const scoreRomaji = computeSimilarity(result.title, aniListTitleRomaji);
            const scoreEnglish = aniListTitleEnglish ? computeSimilarity(result.title, aniListTitleEnglish) : 0;
            const score = Math.max(scoreRomaji, scoreEnglish);
            matchedSeasons.push({ seasonNum, slug: result.slug, score });
          }
        }
        
        // Deduplicate and keep best score per season
        const uniqueSeasons = {};
        for (const item of matchedSeasons) {
          if (!uniqueSeasons[item.seasonNum] || uniqueSeasons[item.seasonNum].score < item.score) {
            uniqueSeasons[item.seasonNum] = item;
          }
        }
        
        const sortedSeasons = Object.values(uniqueSeasons).sort((a, b) => a.seasonNum - b.seasonNum);
        
        if (sortedSeasons.length > 1) {
          const combinedSlug = "multi::" + sortedSeasons.map(s => `${s.seasonNum}||${s.slug}`).join("::");
          console.log(`[Scraper] Mapped AniList [${query}] to multiple seasons on RareAnimes: ${combinedSlug}`);
          return combinedSlug;
        } else if (sortedSeasons.length === 1) {
          console.log(`[Scraper] Mapped AniList [${query}] to single season on RareAnimes: ${sortedSeasons[0].slug}`);
          return sortedSeasons[0].slug;
        }
      }
    }
  }
  return null;
}

function parseEpisodesFromHtml(html, slug) {
  const $ = cheerio.load(html);
  const episodes = [];
  let currentEpisodeNum = null;
  let currentEpisodeName = "";
  
  $(".entry-content").children().each((i, el) => {
    const text = $(el).text().trim();
    const epMatch = text.match(/(?:Episode|Ep)\s*0*(\d+)(?:\s*–\s*(.*))?/i);
    
    if (epMatch) {
      const epNum = parseInt(epMatch[1], 10);
      let epName = `Episode ${epNum}`;
      if (epMatch[2]) {
        const cleanName = epMatch[2].replace(/[–-\s]+/g, " ").trim();
        if (cleanName && !cleanName.includes("[") && !cleanName.includes("Watch") && !cleanName.includes("Download")) {
          epName = cleanName;
        }
      }
      currentEpisodeNum = epNum;
      currentEpisodeName = epName;
    }
    
    // Check for links inside THIS element
    const linksInEl = [];
    $(el).find("a").each((j, aEl) => {
      const aText = $(aEl).text().trim();
      const href = $(aEl).attr("href") || "";
      if (href && (
        aText.includes("Watch") || aText.includes("Stream") || aText.includes("Mult") || aText.includes("Beta") || 
        aText.includes("Mega") || aText.includes("Gdrive") || aText.includes("Mirror") || aText.includes("Download")
      )) {
        linksInEl.push({ label: aText, href });
      }
    });
    
    if (linksInEl.length > 0 && currentEpisodeNum !== null) {
      const exists = episodes.find(e => e.number === currentEpisodeNum);
      if (!exists) {
        const safeSlug = slug.replace(/\//g, "__");
        episodes.push({
          number: currentEpisodeNum,
          title: currentEpisodeName,
          slug: `rareanimes-${safeSlug}-episode-${currentEpisodeNum}`,
          links: linksInEl
        });
      }
      if (!epMatch) {
        currentEpisodeNum = null;
      }
    }
  });
  
  // Style 2: If Style 1 parsed no episodes, try Style 2 (direct links with episode numbers in text)
  if (episodes.length === 0) {
    $(".entry-content a, .entry-content strong a, .entry-content p a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      
      // Match E01, Ep 1, Episode 1, Dragon Ball Super E01, S01E01
      const epMatch = text.match(/(?:\b(?:episode|ep|e)\s*0*|\bS\d+E\s*0*)(\d+(\.\d+)?)\b/i);
      if (epMatch && href) {
        const epNum = parseFloat(epMatch[1]);
        if (!text.toLowerCase().includes("zip") && !href.toLowerCase().includes(".zip")) {
          const exists = episodes.find(e => e.number === epNum);
          if (!exists) {
            const safeSlug = slug.replace(/\//g, "__");
            episodes.push({
              number: epNum,
              title: `Episode ${epNum}`,
              slug: `rareanimes-${safeSlug}-episode-${epNum}`,
              links: [{ label: "WatchMultiQuality", href }]
            });
          }
        }
      }
    });
  }
  
  // Style 3: Movie / OVA - direct download/watch links on the page without episode tags
  if (episodes.length === 0) {
    const movieLinks = [];
    $(".entry-content a").each((i, el) => {
      const aText = $(el).text().trim();
      const href = $(el).attr("href") || "";
      
      if (href && (
        aText.includes("Watch") || 
        aText.includes("Stream") || 
        aText.includes("Mult") || 
        aText.includes("Beta") || 
        aText.includes("Mega") || 
        aText.includes("Gdrive")
      )) {
        movieLinks.push({ label: aText, href });
      }
    });
    
    if (movieLinks.length > 0) {
      const safeSlug = slug.replace(/\//g, "__");
      episodes.push({
        number: 1,
        title: "Movie / OVA",
        slug: `rareanimes-${safeSlug}-episode-1`,
        links: movieLinks
      });
    }
  }
  
  return episodes;
}

function isSlugMatch(parentSlug, targetSlug) {
  const cleanParent = parentSlug.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const cleanTarget = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, " ");
  
  const parentHasShippuden = parentSlug.toLowerCase().includes("shippuden");
  const targetHasShippuden = targetSlug.toLowerCase().includes("shippuden");
  if (parentHasShippuden !== targetHasShippuden) {
    return false;
  }
  
  const ignoreWords = new Set([
    "hindi", "episodes", "download", "complete", "series", "all", "season", "arc", "saga", "dubbed", "watch", "hd", "fhd",
    "tamil", "telugu", "bengali", "malayalam", "english", "audio", "multi"
  ]);
  const parentWords = cleanParent.split(/\s+/).filter(w => w.length > 2 && !ignoreWords.has(w));
  
  if (parentWords.length === 0) return true;
  
  const targetWords = new Set(cleanTarget.split(/\s+/));
  const matched = parentWords.filter(w => targetWords.has(w));
  
  const matchRatio = matched.length / parentWords.length;
  return matchRatio >= 0.8;
}

function cleanParentTitleForSearch(parentTitle) {
  if (!parentTitle) return "";
  let clean = parentTitle;
  clean = clean.replace(/-/g, " ");
  clean = clean.replace(/\b(all|hindi|dubbed|episodes|download|hd|complete|series|season|arc|saga|movie|films?|pack)\b.*/ig, "");
  clean = clean.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return clean;
}

export async function getRareAnimesEpisodes(slug, isSubPage = false) {
  if (isSubPage) {
    return getRareAnimesEpisodesUncached(slug, isSubPage);
  }
  
  const cacheKey = getCacheKey("rare_eps", slug);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    const result = await getRareAnimesEpisodesUncached(slug, isSubPage);
    if (result && result.length > 0) {
      await setCache(cacheKey, result);
    }
    return result;
  });
}

async function getRareAnimesEpisodesUncached(slug, isSubPage = false) {
  // Handle multi-season slug compilation
  if (slug.startsWith("multi::")) {
    const parts = slug.replace("multi::", "").split("::");
    console.log(`[Scraper] Scraping multiple seasons:`, parts);
    
    // We want to scrape all parts and compile them
    const allEpisodes = [];
    let currentAccumulatedOffset = 1;
    
    for (const part of parts) {
      const [seasonNumStr, actualSlug] = part.split("||");
      const seasonNum = parseInt(seasonNumStr, 10);
      
      console.log(`[Scraper] Fetching episodes for season ${seasonNum} slug: ${actualSlug}`);
      const seasonEpisodes = await getRareAnimesEpisodes(actualSlug, true); // acts as subpage call
      
      if (seasonEpisodes.length === 0) continue;
      
      // Determine starting offset
      let offset = currentAccumulatedOffset;
      
      // Check for hardcoded offsets dynamically
      let animeKey = "";
      const lowerSlug = actualSlug.toLowerCase();
      if (lowerSlug.includes("one-piece") || lowerSlug.includes("one_piece")) {
        animeKey = "one piece";
      } else if (lowerSlug.includes("doraemon")) {
        animeKey = "doraemon";
      } else if (lowerSlug.includes("dragon-ball") || lowerSlug.includes("dragon_ball")) {
        animeKey = "dragon ball";
      }
      
      if (animeKey && RAREANIMES_SEASON_OFFSETS[animeKey] && RAREANIMES_SEASON_OFFSETS[animeKey][seasonNum] !== undefined) {
        offset = RAREANIMES_SEASON_OFFSETS[animeKey][seasonNum];
      }
      
      console.log(`[Scraper] Applying offset ${offset} to season ${seasonNum} (${seasonEpisodes.length} episodes)`);
      
      // Re-number episodes and add them
      for (let i = 0; i < seasonEpisodes.length; i++) {
        const ep = seasonEpisodes[i];
        const absoluteEpNum = offset + i;
        allEpisodes.push({
          ...ep,
          number: absoluteEpNum // Set absolute number
        });
      }
      
      // Increment accumulator
      currentAccumulatedOffset = offset + seasonEpisodes.length;
    }
    
    // Sort all combined episodes by their absolute number
    allEpisodes.sort((a, b) => a.number - b.number);
    console.log(`[Scraper] Compiled ${allEpisodes.length} total episodes from multi-season posts`);
    return allEpisodes;
  }

  try {
    const url = slug.startsWith("http") ? slug : `https://www.rareanimes.mov/${slug}/`;
    console.log(`[Scraper] Fetching RareAnimes episodes from: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[Scraper] Episodes fetch failed with status ${res.status} for slug: ${slug}`);
      return [];
    }
    
    const finalUrl = res.url;
    // Resolve zipper redirects to actual RareAnimes slugs if possible
    let resolvedSlug = slug;
    if (finalUrl.includes("rareanimes.mov/")) {
      resolvedSlug = finalUrl.replace(/https?:\/\/(www\.)?rareanimes\.mov\//, "").replace(/\/$/, "");
    }
    
    const html = await res.text();
    
    // Check if the final URL is a codedew multiquality player page
    if (finalUrl.includes("codedew.com/multiquality/") || finalUrl.includes("/multiquality/")) {
      console.log(`[Scraper] Detected codedew multiquality player page: ${finalUrl}`);
      const $ = cheerio.load(html);
      let embedUrl = $("iframe").first().attr("src");
      if (!embedUrl) {
        const match = html.match(/https?:\/\/argon\.razorshell\.space\/embed\/[a-zA-Z0-9]+/);
        if (match) embedUrl = match[0];
      }
      
      if (embedUrl) {
        console.log(`[Scraper] Extracted embed player URL: ${embedUrl}`);
        const safeSlug = slug.replace(/\//g, "__");
        return [{
          number: 1,
          title: "Movie / OVA",
          slug: `rareanimes-${safeSlug}-episode-1`,
          links: [
            { label: "StreamBeta", href: embedUrl },
            { label: "WatchMultiQuality", href: finalUrl }
          ]
        }];
      }
    }
    
    let episodes = parseEpisodesFromHtml(html, resolvedSlug);
    
    // Check if the page has an external linker page (e.g. store.animetoonhindi.com/archives/[id])
    let linkerUrl = "";
    const $ = cheerio.load(html);
    $(".entry-content a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (href && (href.includes("animetoonhindi.com/archives/") || href.includes("/archives/") || text.toLowerCase().includes("multiquality"))) {
        linkerUrl = href;
        return false; // break
      }
    });

    if (linkerUrl && (episodes.length <= 1 || episodes.some(ep => ep.links.some(l => l.href.includes("/archives/") || l.href.includes("animetoonhindi.com"))))) {
      console.log(`[Scraper] Found linker page directly on ${slug}: ${linkerUrl}. Fetching linker page...`);
      const linkerRes = await fetch(linkerUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
      });
      const linkerHtml = await linkerRes.text();
      const finalLinkerUrl = linkerRes.url;
      
      if (finalLinkerUrl.includes("codedew.com/multiquality/") || finalLinkerUrl.includes("/multiquality/")) {
        console.log(`[Scraper] Detected codedew multiquality page via linker redirect: ${finalLinkerUrl}`);
        const $ = cheerio.load(linkerHtml);
        let embedUrl = $("iframe").first().attr("src");
        if (!embedUrl) {
          const match = linkerHtml.match(/https?:\/\/argon\.razorshell\.space\/embed\/[a-zA-Z0-9]+/);
          if (match) embedUrl = match[0];
        }
        if (embedUrl) {
          console.log(`[Scraper] Extracted embed player URL from linker: ${embedUrl}`);
          const safeSlug = slug.replace(/\//g, "__");
          episodes = [{
            number: 1,
            title: "Movie / OVA",
            slug: `rareanimes-${safeSlug}-episode-1`,
            links: [
              { label: "StreamBeta", href: embedUrl },
              { label: "WatchMultiQuality", href: finalLinkerUrl }
            ]
          }];
        } else {
          episodes = parseEpisodesFromHtml(linkerHtml, slug);
        }
      } else {
        episodes = parseEpisodesFromHtml(linkerHtml, slug);
      }
      console.log(`[Scraper] Parsed ${episodes.length} episodes from linker page: ${linkerUrl}`);
    }
    
    // Check for Arc/Season sub-pages if we are not already in a sub-page
    if (episodes.length === 0 && !isSubPage) {
      console.log(`[Scraper] No direct episodes found for ${slug}. Checking for Arc/Season sub-pages...`);
      const $ = cheerio.load(html);
      const arcLinks = [];
      
      $(".entry-content a").each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const lowerText = text.toLowerCase();
        
        if (href && (lowerText.includes("arc") || lowerText.includes("season") || lowerText.includes("saga"))) {
          const numMatch = text.match(/(?:arc|season|saga|part)\s*(\d+)/i) || href.match(/(?:arc|season|saga|part)-(\d+)/i);
          const num = numMatch ? parseInt(numMatch[1], 10) : i + 1;
          arcLinks.push({ text, href, seasonNum: num });
        }
      });
      
      if (arcLinks.length > 0) {
        arcLinks.sort((a, b) => a.seasonNum - b.seasonNum);
        console.log(`[Scraper] Found ${arcLinks.length} Arc/Season links. Resolving sequentially sorted...`);
        
        const results = await Promise.all(
          arcLinks.map(async (link) => {
            try {
              console.log(`[Scraper] Fetching/following redirect for: ${link.text} -> ${link.href}`);
              let subRes = await fetch(link.href, {
                headers: { 
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                  "Referer": url
                }
              });
              
              let subSlug = subRes.url.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
              
              const parentHasShippuden = slug.toLowerCase().includes("shippuden");
              const subHasShippuden = subSlug.toLowerCase().includes("shippuden");
              const isMismatch = !isSlugMatch(slug, subSlug) || (parentHasShippuden !== subHasShippuden);
              
              if (isMismatch) {
                console.log(`[Scraper] Slug mismatch or category mismatch detected. Redirected slug: "${subSlug}" for parent slug: "${slug}". Attempting search correction...`);
                const numMatch = link.text.match(/(?:arc|season|saga|part)\s*(\d+)/i) || link.href.match(/(?:arc|season|saga|part)-(\d+)/i);
                const seasonNum = numMatch ? parseInt(numMatch[1], 10) : null;
                
                const cleanParent = cleanParentTitleForSearch(slug.split("/").pop());
                let searchQuery = cleanParent;
                if (seasonNum) {
                  searchQuery += ` Season ${seasonNum}`;
                } else {
                  searchQuery += ` ${link.text.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim()}`;
                }
                
                console.log(`[Scraper] Searching RareAnimes for corrected slug: "${searchQuery}"`);
                const searchResults = await searchRareAnimes(searchQuery);
                
                let bestMatch = null;
                for (const result of searchResults) {
                  if (isSlugMatch(slug, result.slug)) {
                    if (seasonNum) {
                      const resTitleLower = result.title.toLowerCase();
                      const resSlugLower = result.slug.toLowerCase();
                      const hasSeason = resTitleLower.includes(`season ${seasonNum}`) ||
                                        resTitleLower.includes(`season 0${seasonNum}`) ||
                                        resSlugLower.includes(`season-${seasonNum}`) ||
                                        resSlugLower.includes(`season-0${seasonNum}`);
                      if (!hasSeason) continue;
                    }
                    bestMatch = result.slug;
                    break;
                  }
                }
                
                if (bestMatch) {
                  console.log(`[Scraper] Correction successful! Using search result slug: "${bestMatch}"`);
                  subSlug = bestMatch;
                } else {
                  console.log(`[Scraper] Correction failed for query "${searchQuery}". Falling back to redirected slug "${subSlug}".`);
                }
              }
              
              const subEpisodes = await getRareAnimesEpisodes(subSlug, true);
              console.log(`[Scraper] Recursively parsed ${subEpisodes.length} episodes from sub-slug ${subSlug}`);
              return { seasonNum: link.seasonNum, episodes: subEpisodes };
            } catch (err) {
              console.warn(`[Scraper] Error fetching sub-page ${link.href}:`, err.message || err);
              return { seasonNum: link.seasonNum, episodes: [] };
            }
          })
        );
        
        results.sort((a, b) => a.seasonNum - b.seasonNum);
        let absoluteEpisodeNum = 1;
        const allEpisodes = [];
        for (const res of results) {
          for (const ep of res.episodes) {
            allEpisodes.push({
              ...ep,
              number: absoluteEpisodeNum,
              slug: ep.slug.replace(/-episode-(\d+(\.\d+)?)/i, `-episode-${absoluteEpisodeNum}`)
            });
            absoluteEpisodeNum++;
          }
        }
        
        episodes = allEpisodes;
      }
    }
    
    const sorted = episodes.sort((a, b) => a.number - b.number);
    console.log(`[Scraper] RareAnimes parsed ${sorted.length} episodes total`);
    return sorted;
  } catch (error) {
    console.warn("[Scraper] Error in getRareAnimesEpisodes:", error.message || error);
    return [];
  }
}

// In-memory cache for JuicyCodes decryption player script to avoid repetitive fetches
let cachedPlayerJs = null;

// In-memory cache for extracted stream results { result, expiresAt }
const extractionCache = new Map();
const EXTRACTION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getPlayerJs() {
  if (cachedPlayerJs) return cachedPlayerJs;
  try {
    const res = await fetch("https://argon.razorshell.space/assets/players/jwplayer/player.js?cb=3849805144", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://codedew.com/"
      }
    });
    if (res.ok) {
      cachedPlayerJs = await res.text();
      return cachedPlayerJs;
    }
  } catch (err) {
    console.error("[Scraper] Failed to fetch player.js for juicycodes:", err);
  }
  return null;
}

export async function extractRareAnimesStream(embedUrl) {
  const cached = extractionCache.get(embedUrl);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[Scraper] Extraction cache hit for: ${embedUrl}`);
    return cached.result;
  }

  const reqKey = `extract_stream:${embedUrl}`;
  return deduplicateRequest(reqKey, async () => {
    const doubleCheck = extractionCache.get(embedUrl);
    if (doubleCheck && Date.now() < doubleCheck.expiresAt) {
      return doubleCheck.result;
    }
    return extractRareAnimesStreamUncached(embedUrl);
  });
}

async function extractRareAnimesStreamUncached(embedUrl) {
  try {
    console.log(`[Scraper] Extracting RareAnimes stream from: ${embedUrl}`);
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://codedew.com/"
      }
    });
    
    const cookies = res.headers.get("set-cookie") || "";
    const html = await res.text();
    const finalUrl = res.url;
    
    // Case 1: StreamBeta
    if (finalUrl.includes("streambeta")) {
      const varMatch = html.match(/const _x_\d+\s*=\s*['"]([^'"]+)['"]/);
      if (!varMatch) {
        throw new Error("Encrypted _x_ variable not found on streambeta page");
      }
      const encryptedStr = varMatch[1];
      const reversed = encryptedStr.split("").reverse().join("");
      const fileId = Buffer.from(reversed, "base64").toString("utf-8");
      
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      };
      
      if (cookies) {
        const parsedCookies = cookies.split(",").map(c => c.split(";")[0].trim()).join("; ");
        headers["Cookie"] = parsedCookies;
      }
      
      const postRes = await fetch(finalUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileId })
      });
      
      const json = await postRes.json();
      if (json.success && json.player_sources && json.player_sources.length > 0) {
        const source = json.player_sources[0];
        const isHls = source.url.includes(".m3u8") || source.url.includes("stream");
        const result = {
          directUrl: source.url,
          type: isHls ? "hls" : "mp4",
          qualities: json.player_sources.map(s => ({
            url: s.url,
            label: s.name || "Default",
            type: isHls ? "hls" : "mp4"
          }))
        };
        extractionCache.set(embedUrl, { result, expiresAt: Date.now() + EXTRACTION_CACHE_TTL });
        return result;
      }
    }
    
    // Case 2: MultiQuality / Razorshell
    if (finalUrl.includes("razorshell.space") || html.includes("razorshell.space/embed") || finalUrl.includes("multiquality")) {
      let embedHtml = html;
      const isAlreadyEmbed = finalUrl.includes("razorshell.space/embed");
      
      if (!isAlreadyEmbed) {
        let iframeUrl = "";
        const iframeMatch = html.match(/iframe\s+src="([^"]+)"/i);
        if (iframeMatch) {
          iframeUrl = iframeMatch[1];
        }
        
        if (iframeUrl) {
          const embedRes = await fetch(iframeUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              "Referer": "https://codedew.com/"
            }
          });
          embedHtml = await embedRes.text();
        }
      }
      
      const jcMatch = embedHtml.match(/_juicycodes\(([\s\S]*?)\)/);
        if (jcMatch) {
          let encryptedStr = "";
          try {
            encryptedStr = new Function(`return ${jcMatch[1]}`)();
          } catch (e) {
            console.error("[Scraper] Failed to eval juicycodes string:", e);
          }
          
          if (encryptedStr) {
            const playerJs = await getPlayerJs();
            if (playerJs) {
              const vm = await import("node:vm");
              let capturedEvalCode = "";
              const sandbox = {
                window: {},
                document: { addEventListener: () => {}, removeEventListener: () => {} },
                navigator: { userAgent: "Mozilla/5.0" },
                setTimeout, setInterval, clearTimeout, clearInterval, console,
                eval: (code) => { capturedEvalCode = code; }
              };
              sandbox.window = sandbox;
              sandbox.self = sandbox;
              sandbox.top = sandbox;
              
              const context = vm.createContext(sandbox);
              vm.runInContext(playerJs, context);
              vm.runInContext(`window._juicycodes("${encryptedStr}")`, context);
              
              const configMatch = capturedEvalCode.match(/var config = (\{[\s\S]*?\});/);
              if (configMatch) {
                const config = JSON.parse(configMatch[1]);
                if (config.sources && config.sources.file) {
                  const directUrl = config.sources.file;
                  const isHls = directUrl.includes(".m3u8") || config.sources.type === "application/x-mpegURL";
                  
                  const qualities = [];
                  if (config.sources.labels) {
                    Object.entries(config.sources.labels).forEach(([res, label]) => {
                      qualities.push({
                        url: directUrl,
                        label,
                        type: isHls ? "hls" : "mp4"
                      });
                    });
                  }
                  
                  const result = {
                    directUrl,
                    type: isHls ? "hls" : "mp4",
                    qualities: qualities.length > 0 ? qualities : undefined
                  };
                  extractionCache.set(embedUrl, { result, expiresAt: Date.now() + EXTRACTION_CACHE_TTL });
                  return result;
                }
              }
            }
          }
        }
      }
    
    throw new Error("No recognized streaming provider format found");
  } catch (error) {
    console.error("[Scraper] extractRareAnimesStream error:", error);
    return null;
  }
}

// --- AniDap (Fallback) Scraper ---

export async function getAnidapSlug(anilistId) {
  const cacheKey = getCacheKey("anidap_slug", String(anilistId));
  const cached = await getCache(cacheKey, LONG_CACHE_TTL);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey, LONG_CACHE_TTL);
    if (doubleCheck) return doubleCheck;
    
    const url = `https://anidap.se/watch.data?id=${anilistId}&ep=1&type=sub&provider=yuki`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Referer": `https://anidap.se/watch?id=${anilistId}&ep=1`
        }
      });
      if (!res.ok) {
        console.warn(`[AniDap] watch.data returned ${res.status} for AniList ID: ${anilistId}`);
        return null;
      }
      const json = await res.json();
      if (!Array.isArray(json)) return null;
      
      const idNum = Number(anilistId);
      const idStr = String(anilistId);
      let idIndex = json.indexOf(idNum);
      if (idIndex === -1) idIndex = json.indexOf(idStr);
      if (idIndex === -1) return null;
      
      let slug = null;
      json.forEach(item => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const resolved = {};
          for (const [k, v] of Object.entries(item)) {
            if (typeof v === 'number' && v >= 0 && v < json.length) {
              resolved[k] = json[v];
            }
          }
          let hasId = false;
          for (const val of Object.values(resolved)) {
            if (val === idNum || val === idStr) hasId = true;
          }
          if (hasId) {
            for (const val of Object.values(resolved)) {
              if (typeof val === 'string' && /^[a-z0-9-]+-[a-z0-9]{5}$/.test(val)) {
                slug = val;
              }
            }
          }
        }
      });
      
      if (slug) {
        await setCache(cacheKey, slug, LONG_CACHE_TTL);
        console.log(`[AniDap] Resolved slug for AniList ID ${anilistId}: ${slug}`);
        return slug;
      }
      return null;
    } catch (err) {
      console.error(`[AniDap] Failed to fetch slug for AniList ID ${anilistId}:`, err.message);
      return null;
    }
  });
}

export async function getAnidapEpisodes(anilistId, isDub = false, aniListEpisodes = 0) {
  const cacheKey = getCacheKey("anidap_eps", `${anilistId}_${isDub}`);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    let count = aniListEpisodes || 0;
    
    if (!count) {
      const url = `https://anidap.se/watch.data?id=${anilistId}&ep=1&type=${isDub ? 'dub' : 'sub'}&provider=yuki`;
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Referer": `https://anidap.se/watch?id=${anilistId}&ep=1`
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            const idNum = Number(anilistId);
            const idStr = String(anilistId);
            json.forEach(item => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                const resolved = {};
                for (const [k, v] of Object.entries(item)) {
                  if (typeof v === 'number' && v >= 0 && v < json.length) {
                    resolved[k] = json[v];
                  }
                }
                let hasId = false;
                for (const val of Object.values(resolved)) {
                  if (val === idNum || val === idStr) hasId = true;
                }
                if (hasId) {
                  for (const val of Object.values(resolved)) {
                    if (typeof val === 'number' && val > 0 && val < 3000) {
                      // Skip release years (1950 - 2050) to avoid parsing them as episode counts
                      const isYear = val >= 1950 && val <= 2050;
                      if (!isYear && val > count) {
                        count = val;
                      }
                    }
                  }
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn(`[AniDap] Error resolving dynamic episode count for AniList ID ${anilistId}:`, e.message);
      }
    }
    
    if (!count) {
      count = 1;
    }
    
    const episodes = [];
    const typeStr = isDub ? "dub" : "sub";
    for (let i = 1; i <= count; i++) {
      episodes.push({
        number: i,
        slug: `anidap-${anilistId}-${i}-${typeStr}`
      });
    }
    
    if (episodes.length > 0) {
      await setCache(cacheKey, episodes);
    }
    return episodes;
  });
}

export async function extractAnidapStream(embedUrl) {
  const cacheKey = getCacheKey("anidap_stream", embedUrl);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    try {
      const urlObj = new URL(embedUrl);
      const anilistId = urlObj.searchParams.get("id");
      const epNum = urlObj.searchParams.get("ep") || "1";
      const type = urlObj.searchParams.get("type") || "sub";
      
      if (!anilistId) throw new Error("Missing AniList ID in embedUrl");
      
      const slug = await getAnidapSlug(anilistId);
      if (!slug) throw new Error(`Could not resolve AniDap slug for AniList ID: ${anilistId}`);
      
      let data = null;
      const providers = ["beep", "neko", "mimi", "yuki"];
      
      for (const provider of providers) {
        try {
          const sourcesUrl = `https://chad.anidap.se/rest/api/sources?id=${slug}&epNum=${epNum}&type=${type}&providerId=${provider}`;
          const res = await fetch(sourcesUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              "Referer": "https://anidap.se/"
            }
          });
          if (res.ok) {
            const json = await res.json();
            if (json.sources && json.sources.length > 0) {
              data = json;
              break;
            }
          }
        } catch (e) {
          console.warn(`[AniDap] Failed to fetch sources for provider ${provider}:`, e.message);
        }
      }
      
      if (!data) {
        throw new Error("No sources found in AniDap API response across all providers");
      }
      
      const directUrl = data.sources[0].url;
      let finalUrl = directUrl;
      
      if (directUrl.includes("mewstream.buzz")) {
        let hex = "";
        for (let i = 0; i < directUrl.length; i++) {
          const code = directUrl.charCodeAt(i) ^ 137;
          hex += code.toString(16).padStart(2, "0");
        }
        finalUrl = `https://crs.24stream.xyz/media/${hex}?origin=https%3A%2F%2Fmegaplay.buzz`;
      }
      
      const result = {
        directUrl: finalUrl,
        type: "hls"
      };
      
      await setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error("[AniDap] extractAnidapStream error:", err.message);
      return null;
    }
  });
}

// --- ToonStream Scraper ---

export async function searchToonStream(keyword) {
  const reqKey = `search_toonstream:${keyword}`;
  return deduplicateRequest(reqKey, () => searchToonStreamUncached(keyword));
}

async function searchToonStreamUncached(keyword) {
  try {
    const url = `https://toonstream.vip/?s=${encodeURIComponent(keyword)}`;
    console.log(`[ToonStream] Searching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[ToonStream] Search fetch failed with status: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $("article, .result-item, .search-result").each((i, element) => {
      const aTag = $(element).find("a").first();
      const href = aTag.attr("href");
      
      if (href && (href.includes("/series/") || href.includes("/movies/"))) {
        const title = $(element).find(".entry-title, .title, h3, h2").text().trim() || aTag.attr("title") || aTag.text().trim();
        const slug = href.replace("https://toonstream.vip/", "").replace(/\/$/, "");
        results.push({ title, slug });
      }
    });
    
    console.log(`[ToonStream] Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.warn("[ToonStream] Error in searchToonStream:", error.message || error);
    return [];
  }
}

export async function findToonStreamSlug(aniListTitleRomaji, aniListTitleEnglish, format = "", seasonYear = null) {
  if (!aniListTitleEnglish && aniListTitleRomaji) {
    const fallbackEnglish = getDoraemonEnglishTitle(aniListTitleRomaji);
    if (fallbackEnglish) {
      aniListTitleEnglish = fallbackEnglish;
    }
  }
  const cacheKey = getCacheKey("toon_slug3", `${aniListTitleRomaji}_${aniListTitleEnglish}`);
  const cached = await getCache(cacheKey, LONG_CACHE_TTL);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey, LONG_CACHE_TTL);
    if (doubleCheck) return doubleCheck;
    
    const result = await findToonStreamSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format, seasonYear);
    if (result) {
      await setCache(cacheKey, result, LONG_CACHE_TTL);
    }
    return result;
  });
}

async function findToonStreamSlugUncached(aniListTitleRomaji, aniListTitleEnglish, format = "", seasonYear = null) {
  const searchQueries = getSearchQueries(aniListTitleRomaji, aniListTitleEnglish);
  
  for (const query of searchQueries) {
    const results = await searchToonStream(query);
    if (results.length > 0) {
      let bestMatch = null;
      let highestScore = 0;
      
      for (const result of results) {
        // Strict Title & Year Verification
        if (!verifyTitleMatchForAny(aniListTitleRomaji, aniListTitleEnglish, result.title, seasonYear)) {
          continue;
        }
        
        const scoreRomaji = computeSimilarity(result.title, aniListTitleRomaji);
        const scoreEnglish = aniListTitleEnglish ? computeSimilarity(result.title, aniListTitleEnglish) : 0;
        let score = Math.max(scoreRomaji, scoreEnglish);
        
        const lowerTitle = result.title.toLowerCase();
        const isMovie = format === "MOVIE";
        const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("movies/");
        
        if (isMovie) {
          if (titleHasMovie) score += 0.15;
        } else {
          if (titleHasMovie) score -= 0.3;
        }
        
        if (score > highestScore && score > 0.35) {
          highestScore = score;
          bestMatch = result.slug;
        }
      }
      
      if (bestMatch) {
        console.log(`[ToonStream] Mapped to slug: ${bestMatch}`);
        return bestMatch;
      }
    }
  }
  return null;
}

export async function getToonStreamEpisodes(slug) {
  const cacheKey = getCacheKey("toon_eps4", slug);
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  return deduplicateRequest(cacheKey, async () => {
    const doubleCheck = await getCache(cacheKey);
    if (doubleCheck) return doubleCheck;
    
    const result = await getToonStreamEpisodesUncached(slug);
    if (result && result.length > 0) {
      await setCache(cacheKey, result);
    }
    return result;
  });
}

async function getToonStreamEpisodesUncached(slug) {
  try {
    const url = `https://toonstream.vip/${slug}/`;
    console.log(`[ToonStream] Fetching episodes from: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    if (!res.ok) {
      console.warn(`[ToonStream] Episodes fetch failed with status ${res.status} for slug: ${slug}`);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const episodes = [];
    
    if (slug.startsWith("movies/")) {
      episodes.push({
        number: 1,
        title: "Movie / OVA",
        slug: `toonstream-${slug}`
      });
      return episodes;
    }

    // Helper: extract episode entries from a cheerio DOM
    function extractEpisodes($ctx, defaultSeason = 1) {
      const found = [];
      $ctx("a").each((i, el) => {
        const href = $ctx(el).attr('href') || '';
        if (href.includes('/episode/')) {
          const path = href.replace('https://toonstream.vip/', '').replace(/\/$/, '');
          // Matches SxE pattern at end of path, e.g. dragon-ball-z-kai-1x26
          const numMatch = path.match(/[-_](\d+)x(\d+(\.\d+)?)$/i);
          let season = defaultSeason;
          let ep = parseFloat(path.split("-").pop()); // fallback
          if (numMatch) {
            season = parseInt(numMatch[1], 10);
            ep = parseFloat(numMatch[2]);
          }
          found.push({
            number: ep,
            season,
            title: `Episode ${ep}`,
            slug: `toonstream-${path.replace(/\//g, '__')}`
          });
        }
      });
      return found;
    }

    // 1. Scrape series page (gets Season 1 episodes)
    const seriesEps = extractEpisodes($);
    episodes.push(...seriesEps);

    // 2. Fetch other seasons if present via AJAX
    const seasonElements = $(".choose-season li.sel-temp a");
    if (seasonElements.length > 0) {
      const ajaxPromises = [];
      seasonElements.each((i, el) => {
        const seasonVal = $(el).attr("data-season");
        const postVal = $(el).attr("data-post");
        const seasonNum = parseInt(seasonVal, 10);
        
        // Skip Season 1 since we already have it from the main series page
        if (seasonNum > 1 && postVal) {
          ajaxPromises.push((async () => {
            try {
              const ajaxUrl = "https://toonstream.vip/wp-admin/admin-ajax.php";
              const formData = new URLSearchParams();
              formData.append("action", "action_select_season");
              formData.append("season", seasonVal);
              formData.append("post", postVal);

              const ajaxRes = await fetch(ajaxUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                  "Referer": url
                },
                body: formData.toString()
              });

              if (ajaxRes.ok) {
                const ajaxHtml = await ajaxRes.text();
                const ajax$ = cheerio.load(ajaxHtml);
                return extractEpisodes(ajax$, seasonNum);
              }
            } catch (e) {
              console.warn(`[ToonStream] Failed to fetch Season ${seasonNum} via AJAX:`, e.message);
            }
            return [];
          })());
        }
      });

      if (ajaxPromises.length > 0) {
        const ajaxResults = await Promise.all(ajaxPromises);
        for (const resList of ajaxResults) {
          episodes.push(...resList);
        }
      }
    }

    // Deduplicate by slug
    const seen = new Set();
    const uniqueEpisodes = [];
    for (const ep of episodes) {
      if (!seen.has(ep.slug)) {
        seen.add(ep.slug);
        uniqueEpisodes.push(ep);
      }
    }

    // Sort and global index
    const bySeason = {};
    for (const ep of uniqueEpisodes) {
      const s = ep.season || 1;
      if (!bySeason[s]) bySeason[s] = [];
      bySeason[s].push(ep);
    }
    
    const seasons = Object.keys(bySeason).map(Number).sort((a, b) => a - b);
    let globalNum = 0;
    const flattened = [];
    for (const s of seasons) {
      const sEps = bySeason[s].sort((a, b) => a.number - b.number);
      for (const ep of sEps) {
        globalNum++;
        flattened.push({ ...ep, number: globalNum });
      }
    }
    
    console.log(`[ToonStream] Parsed ${flattened.length} episodes (${seasons.length} season(s))`);
    return flattened;
  } catch (error) {
    console.warn("[ToonStream] Error in getToonStreamEpisodes:", error.message || error);
    return [];
  }
}
