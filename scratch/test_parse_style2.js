import * as cheerio from "cheerio";

function parseEpisodesFromHtml(html, slug) {
  const $ = cheerio.load(html);
  let episodes = [];
  let currentEpisodeNum = null;
  let currentEpisodeName = "";
  
  // Style 1: Heading/Paragraph with "Episode X" followed by links
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
  
  // Style 2: If Style 1 parsed no episodes, try Style 2 (direct links with episode numbers in text)
  if (episodes.length === 0) {
    $(".entry-content a, .entry-content strong a, .entry-content p a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      
      console.log(`Checking link text: "${text}", href: "${href}"`);
      
      // Match E01, Ep 1, Episode 1, Dragon Ball Super E01
      const epMatch = text.match(/\b(?:episode|ep|e)\s*0*(\d+(\.\d+)?)\b/i);
      console.log(`- epMatch:`, epMatch ? epMatch[0] : null);
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
            console.log("Pushed! episodes count:", episodes.length);
          } else {
            console.log("Already exists:", epNum);
          }
        }
      }
    });
  }
  
  return episodes;
}

async function run() {
  const url = "https://store.animetoonhindi.com/archives/10986";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const episodes = parseEpisodesFromHtml(html, "test-slug");
  console.log(`Parsed ${episodes.length} episodes.`);
}

run();
