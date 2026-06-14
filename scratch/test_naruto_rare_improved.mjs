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

async function searchRareAnimes(keyword) {
  try {
    const url = `https://www.rareanimes.mov/?s=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return [];
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
    return results;
  } catch (error) {
    return [];
  }
}

function parseEpisodesFromHtml(html, slug) {
  const $ = cheerio.load(html);
  const episodes = [];
  let currentEpisodeNum = null;
  let currentEpisodeName = "";
  
  $(".entry-content").children().each((i, el) => {
    const text = $(el).text().trim();
    const epMatch = text.match(/Episode\s*(\d+)(?:\s*–\s*(.*))?/i);
    
    if (epMatch) {
      currentEpisodeNum = parseInt(epMatch[1]);
      currentEpisodeName = epMatch[2] ? epMatch[2].trim() : `Episode ${currentEpisodeNum}`;
    } else if (currentEpisodeNum !== null) {
      const linksInEl = [];
      $(el).find("a").each((j, aEl) => {
        const aText = $(aEl).text().trim();
        const href = $(aEl).attr("href") || "";
        
        if (aText.includes("Watch") || aText.includes("Stream") || aText.includes("Mult") || aText.includes("Beta")) {
          linksInEl.push({ label: aText, href });
        }
      });
      
      if (linksInEl.length > 0) {
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
        currentEpisodeNum = null;
      }
    }
  });
  
  if (episodes.length === 0) {
    $(".entry-content a, .entry-content strong a, .entry-content p a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const epMatch = text.match(/\b(?:episode|ep|e)\s*0*(\d+(\.\d+)?)\b/i);
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

async function findRareAnimesSlugImproved(aniListTitleRomaji, aniListTitleEnglish, format = "") {
  const cleanTitleRomaji = (aniListTitleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (aniListTitleEnglish || "").toLowerCase().trim();
  
  if (cleanTitleRomaji === "naruto" || cleanTitleEnglish === "naruto") {
    return "hindi/naruto-all-season-hindi-tamil-telugu-bengali-malayalam-episodes-download-hd";
  }
  if (cleanTitleRomaji === "naruto shippuden" || cleanTitleEnglish === "naruto shippuden" || 
      cleanTitleRomaji === "naruto: shippuuden" || cleanTitleEnglish === "naruto: shippuuden") {
    return "hindi/naruto-shippuden-all-season-hindi-tamil-telugu-bengali-malayalam-episodes-download-hd";
  }

  const searchQueries = [aniListTitleRomaji, aniListTitleEnglish].filter(Boolean);
  for (const query of searchQueries) {
    const results = await searchRareAnimes(query);
    if (results.length > 0) {
      let bestMatch = null;
      let highestScore = 0;
      for (const result of results) {
        const scoreRomaji = computeSimilarity(result.title, aniListTitleRomaji);
        const scoreEnglish = aniListTitleEnglish ? computeSimilarity(result.title, aniListTitleEnglish) : 0;
        let score = Math.max(scoreRomaji, scoreEnglish);
        
        const lowerTitle = result.title.toLowerCase();
        const isMovie = format === "MOVIE";
        const titleHasMovie = lowerTitle.includes("movie") || lowerTitle.includes("film") || result.slug.includes("-movie");
        if (isMovie) {
          if (titleHasMovie) score += 0.15;
        } else {
          if (titleHasMovie) score -= 0.3;
        }
        if (score > highestScore && (score > 0.35 || result.title.toLowerCase().includes(query.toLowerCase()))) {
          highestScore = score;
          bestMatch = result.slug;
        }
      }
      if (bestMatch) {
        console.log(`[Scraper] Mapped AniList [${query}] to RareAnimes: ${bestMatch}`);
        return bestMatch;
      }
    }
  }
  return null;
}

async function getRareAnimesEpisodesImproved(slug, isSubPage = false) {
  try {
    const url = `https://www.rareanimes.mov/${slug}/`;
    console.log(`[Scraper] Fetching RareAnimes episodes from: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return [];
    
    const html = await res.text();
    let episodes = parseEpisodesFromHtml(html, slug);
    
    if (episodes.length === 0) {
      const $ = cheerio.load(html);
      let linkerUrl = "";
      $(".entry-content a").each((i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href && (href.includes("animetoonhindi.com/archives/") || href.includes("/archives/") || text.toLowerCase().includes("multiquality"))) {
          linkerUrl = href;
          return false;
        }
      });
      if (linkerUrl) {
        console.log(`[Scraper] Found linker page directly on ${slug}: ${linkerUrl}`);
        const linkerRes = await fetch(linkerUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
        });
        const linkerHtml = await linkerRes.text();
        episodes = parseEpisodesFromHtml(linkerHtml, slug);
      }
    }
    
    if (episodes.length === 0 && !isSubPage) {
      console.log(`[Scraper] Checking for Arc/Season sub-pages...`);
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
        console.log(`[Scraper] Found ${arcLinks.length} seasons. Resolving sequentially sorted...`);
        
        const results = await Promise.all(
          arcLinks.map(async (link) => {
            try {
              console.log(`[Scraper] Fetching sub-page: ${link.text} (${link.seasonNum})`);
              const subRes = await fetch(link.href, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
              });
              let subSlug = subRes.url.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
              
              const parentHasShippuden = slug.toLowerCase().includes("shippuden");
              const subHasShippuden = subSlug.toLowerCase().includes("shippuden");
              const isMismatch = !isSlugMatch(slug, subSlug) || (parentHasShippuden !== subHasShippuden);
              
              if (isMismatch) {
                console.log(`[Scraper] Slug mismatch or category mismatch detected for redirected slug: "${subSlug}" for parent slug: "${slug}". Performing search correction...`);
                const numMatch = link.text.match(/(?:arc|season|saga|part)\s*(\d+)/i) || link.href.match(/(?:arc|season|saga|part)-(\d+)/i);
                const seasonNum = numMatch ? parseInt(numMatch[1], 10) : null;
                const cleanParent = cleanParentTitleForSearch(slug.split("/").pop());
                let searchQuery = cleanParent;
                if (seasonNum) searchQuery += ` Season ${seasonNum}`;
                else searchQuery += ` ${link.text.replace(/[^a-zA-Z0-9\s]/g, " ").trim()}`;
                
                console.log(`[Scraper] Searching for corrected slug: "${searchQuery}"`);
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
                  console.log(`[Scraper] Found corrected slug: "${bestMatch}"`);
                  subSlug = bestMatch;
                } else {
                  console.log(`[Scraper] Correction failed. Falling back to: "${subSlug}"`);
                }
              }
              const subEpisodes = await getRareAnimesEpisodesImproved(subSlug, true);
              return { seasonNum: link.seasonNum, episodes: subEpisodes };
            } catch (err) {
              console.warn(`[Scraper] Error fetching sub-page ${link.href}:`, err.message);
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
    
    return episodes;
  } catch (error) {
    console.warn("[Scraper] Error:", error.message);
    return [];
  }
}

async function run() {
  console.log("=== Testing Naruto mapping & scraping ===");
  const slug = await findRareAnimesSlugImproved("Naruto", "Naruto", "TV");
  console.log("Resolved Slug:", slug);
  if (slug) {
    const eps = await getRareAnimesEpisodesImproved(slug);
    console.log(`Total episodes found: ${eps.length}`);
    if (eps.length > 0) {
      console.log("First episode:", eps[0]);
      console.log("Episode 50:", eps[49]);
      console.log("Episode 100:", eps[99]);
      console.log("Episode 150:", eps[149]);
      console.log("Last episode:", eps[eps.length - 1]);
    }
  }
}

run();
