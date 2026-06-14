import * as cheerio from "cheerio";

const BASE_URL = "https://www.rareanimes.mov";

async function testSearch(keyword) {
  try {
    const url = `${BASE_URL}/?s=${encodeURIComponent(keyword)}`;
    console.log(`[Test] Searching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    console.log(`[Test] Status: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log(`[Test] Title of page: ${$("title").text()}`);
    
    // WordPress typically lists search results in article tags, or inside a grid.
    // Let's print out all links inside article tags or similar structures to find where post titles are.
    const results = [];
    $("article").each((i, el) => {
      const titleLink = $(el).find("h2.entry-title a, h2 a, h3 a, a").first();
      const href = titleLink.attr("href");
      const title = titleLink.text().trim();
      const img = $(el).find("img").attr("src");
      
      if (href) {
        results.push({ title, href, img });
      }
    });
    
    console.log(`[Test] Found ${results.length} articles on page:`);
    console.log(JSON.stringify(results.slice(0, 10), null, 2));
  } catch (error) {
    console.error("[Test] Error:", error);
  }
}

testSearch("Demon Slayer");
