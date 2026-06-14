import * as cheerio from "cheerio";

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
  return episodes;
}

async function test() {
  const slug = "hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series";
  const url = `https://www.rareanimes.mov/${slug}/`;
  
  console.log("Fetching Dragon Ball Super Main Page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  
  let episodes = parseEpisodesFromHtml(html, slug);
  console.log("Direct episodes found:", episodes.length);
  
  if (episodes.length === 0) {
    const $ = cheerio.load(html);
    const arcLinks = [];
    
    $(".entry-content a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const lowerText = text.toLowerCase();
      
      // Look for links that represent Arcs, Seasons, Sagas
      if (href && (lowerText.includes("arc") || lowerText.includes("season") || lowerText.includes("saga"))) {
        arcLinks.push({ text, href });
      }
    });
    
    console.log("Found Arc/Season links:", arcLinks);
    
    if (arcLinks.length > 0) {
      console.log(`\nScraping Arc 1: ${arcLinks[0].text} (${arcLinks[0].href})...`);
      const subRes = await fetch(arcLinks[0].href, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
      });
      console.log("Sub-page Final URL:", subRes.url);
      
      const subSlug = subRes.url.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
      const subHtml = await subRes.text();
      const subEpisodes = parseEpisodesFromHtml(subHtml, subSlug);
      console.log(`Parsed ${subEpisodes.length} episodes from sub-page.`);
      if (subEpisodes.length > 0) {
        console.log("First episode details:", JSON.stringify(subEpisodes[0], null, 2));
      }
    }
  }
}

test().catch(err => console.error(err));
