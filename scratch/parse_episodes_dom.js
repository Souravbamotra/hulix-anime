import * as cheerio from "cheerio";

const URL = "https://www.rareanimes.mov/hindi/demon-slayer-season-4-hashira-training-arc-hindi-dubbed-crunchyroll-episodes-download-hd/";

async function test() {
  try {
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Let's traverse the entry-content and print out the hierarchy of elements
    console.log("Analyzing .entry-content children structure:");
    
    const episodes = [];
    let currentEpisodeNum = null;
    let currentEpisodeName = "";
    
    $(".entry-content").children().each((i, el) => {
      const text = $(el).text().trim();
      const tagName = el.name;
      
      // Match "Episode XX" or "Episode X"
      const epMatch = text.match(/Episode\s*(\d+)(?:\s*–\s*(.*))?/i);
      
      if (epMatch) {
        currentEpisodeNum = parseInt(epMatch[1]);
        currentEpisodeName = epMatch[2] ? epMatch[2].trim() : `Episode ${currentEpisodeNum}`;
        console.log(`\nDetected Header: Ep ${currentEpisodeNum} - "${currentEpisodeName}" (Tag: <${tagName}>)`);
      } else if (currentEpisodeNum !== null) {
        // If we are currently parsing an episode, check for links inside this element or its children
        const linksInEl = [];
        $(el).find("a").each((j, aEl) => {
          const aText = $(aEl).text().trim();
          const href = $(aEl).attr("href") || "";
          
          // Only capture watch links (exclude donation or other links)
          if (aText.includes("Watch") || aText.includes("Stream") || aText.includes("Mult") || aText.includes("Beta")) {
            linksInEl.push({ label: aText, href });
          }
        });
        
        if (linksInEl.length > 0) {
          console.log(`  Links for Ep ${currentEpisodeNum}:`, linksInEl);
          episodes.push({
            episode: currentEpisodeNum,
            title: currentEpisodeName,
            links: linksInEl
          });
          // Reset to parse the next episode
          currentEpisodeNum = null;
        }
      }
    });
    
    console.log(`\nParsed ${episodes.length} episodes:`);
    console.log(JSON.stringify(episodes.slice(0, 3), null, 2));
  } catch (error) {
    console.error(error);
  }
}
test();
