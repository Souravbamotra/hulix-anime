import * as cheerio from "cheerio";

const GOGOANIME_URL = "https://gogoanimes.cv";

async function testSearch(keyword) {
  try {
    const url = `${GOGOANIME_URL}/?s=${encodeURIComponent(keyword)}`;
    console.log(`[Test] Searching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    console.log(`[Test] Status: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log(`[Test] Page Title: ${$("title").text()}`);
    
    const results = [];
    $("article, .listupd .bs, ul.items li").each((i, element) => {
      const aTag = $(element).find("a").first();
      const href = aTag.attr("href");
      
      console.log(`[Test] Found link: ${href}`);
      
      if (href) {
        const title = $(element).find(".tt").text().trim() || $(element).find(".name").text().trim() || aTag.attr("title") || aTag.text().trim();
        const image = $(element).find("img").attr("src") || $(element).find("img").attr("data-src");
        
        results.push({ title, href, image });
      }
    });
    
    console.log(`[Test] Parsed ${results.length} results:`);
    console.log(JSON.stringify(results.slice(0, 5), null, 2));
  } catch (error) {
    console.error("[Test] Error:", error);
  }
}

testSearch("One Piece");
