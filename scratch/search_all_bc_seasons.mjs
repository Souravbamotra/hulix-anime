import * as cheerio from "cheerio";

async function searchAllPages(keyword) {
  const allResults = [];
  let page = 1;
  const maxPages = 5;

  while (page <= maxPages) {
    const url = `https://www.rareanimes.mov/page/${page}/?s=${encodeURIComponent(keyword)}`;
    console.log(`[Test] Fetching search page ${page}: ${url}`);
    
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
      });
      if (!res.ok) {
        console.log(`[Test] Stop. Status: ${res.status}`);
        break;
      }
      
      const html = await res.text();
      const $ = cheerio.load(html);
      const articles = $("article");
      
      if (articles.length === 0) {
        break;
      }
      
      articles.each((i, el) => {
        const titleLink = $(el).find("h2.entry-title a, .entry-title a").first();
        const href = titleLink.attr("href");
        const title = titleLink.text().trim();
        
        if (href && title.toLowerCase().includes("black clover")) {
          const slug = href.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
          allResults.push({ title, slug });
        }
      });
      
      page++;
    } catch (e) {
      console.error(`[Test] Error page ${page}:`, e.message);
      break;
    }
  }

  console.log("\n=== Black Clover Search Results ===");
  console.log(JSON.stringify(allResults, null, 2));
}

searchAllPages("Black Clover").catch(console.error);
