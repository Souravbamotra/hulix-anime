import * as cheerio from "cheerio";

const URL = "https://www.rareanimes.mov/hindi/jujutsu-kaisen-season-2-hindi-dubbed-episodes-download-hd/";

async function test() {
  try {
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Page Title:", $("title").text());
    
    // Let's print sections in entry-content or text elements containing 'Episode' or streaming links.
    console.log("Checking for lists, buttons, or link elements in the post content:");
    
    const links = [];
    $(".entry-content a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (text || href) {
        links.push({ text, href });
      }
    });
    
    console.log(`Found ${links.length} links in content:`);
    console.log("Sample links:", JSON.stringify(links.slice(0, 40), null, 2));
    
    // Also, print out some HTML segments where text says "Episode 1" or "Hindi Dubbed" or similar
    console.log("\nSearching for episode blocks in entry-content HTML:");
    const contentHtml = $(".entry-content").html() || "";
    // Log first 1500 chars of entry-content
    console.log(contentHtml.substring(0, 1500));
  } catch (error) {
    console.error(error);
  }
}
test();
