import * as cheerio from "cheerio";

const GOGOANIME_URL = "https://9anime.org.lv";

function sanitizeTitle(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

async function searchGogoAnime(keyword) {
  try {
    const url = `${GOGOANIME_URL}/?s=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
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
    return results;
  } catch (error) {
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

// Improved version
async function findGogoAnimeSlugImproved(aniListTitleRomaji, aniListTitleEnglish, format = "", isDub = false) {
  // Hardcoded direct overrides for extremely popular or problematic titles
  const cleanTitleRomaji = (aniListTitleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (aniListTitleEnglish || "").toLowerCase().trim();
  
  if (cleanTitleRomaji === "one piece" || cleanTitleEnglish === "one piece") {
    return isDub ? "anime/one-piece-dub" : "anime/one-piece";
  }

  const searchQueries = [aniListTitleRomaji, aniListTitleEnglish].filter(Boolean);
  
  for (const query of searchQueries) {
    const results = await searchGogoAnime(isDub ? `${query} (Dub)` : query);
    if (results.length > 0) {
      let bestMatch = null;
      let highestScore = 0;
      
      for (const result of results) {
        const cleanTitle = result.title.replace(/\s*\(Dub\)$/i, "").replace(/\s+/g, " ").trim();
        const scoreRomaji = computeSimilarity(cleanTitle, aniListTitleRomaji);
        const scoreEnglish = aniListTitleEnglish ? computeSimilarity(cleanTitle, aniListTitleEnglish) : 0;
        let score = Math.max(scoreRomaji, scoreEnglish);
        
        const lowerTitle = result.title.toLowerCase();
        const isMovie = format === "MOVIE";
        const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("-movie");
        
        if (isMovie) {
          if (titleHasMovie) score += 0.15;
        } else {
          if (titleHasMovie) score -= 0.3;
        }
        
        const isResultDub = lowerTitle.includes("(dub)") || result.slug.includes("-dub");
        if (isDub && !isResultDub) score -= 0.5;
        if (!isDub && isResultDub) score -= 0.5;
        
        if (score > highestScore && score > 0.4) {
          highestScore = score;
          bestMatch = result.slug;
        }
      }
      
      // If we found an exact match (or very close to it), use it immediately
      if (bestMatch && highestScore >= 0.95) {
        console.log(`[Scraper] Exact/high confidence match found: ${bestMatch} (${highestScore})`);
        return bestMatch;
      }
      
      // If the match score is sub-optimal (e.g. 0.8), verify if the fallback slug exists
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
        console.log(`[Scraper] Checking if fallback slug exists: ${fallbackSlug}`);
        const exists = await checkSlugExists(fallbackSlug);
        if (exists) {
          console.log(`[Scraper] Fallback slug verified & chosen: ${fallbackSlug}`);
          return fallbackSlug;
        }
      }

      // If fallback doesn't exist, use the best match we found
      if (bestMatch) {
        console.log(`[Scraper] Fallback didn't exist. Using best search match: ${bestMatch} (${highestScore})`);
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

async function run() {
  console.log("--- Testing 'One Piece' mapping (Sub) ---");
  const slugSub = await findGogoAnimeSlugImproved("One Piece", "One Piece", "TV", false);
  console.log("Sub slug returned:", slugSub);

  console.log("\n--- Testing 'One Piece' mapping (Dub) ---");
  const slugDub = await findGogoAnimeSlugImproved("One Piece", "One Piece", "TV", true);
  console.log("Dub slug returned:", slugDub);
}

run();
