import * as cheerio from "cheerio";

async function run() {
  const url = "https://store.animetoonhindi.com/archives/13238";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML Length:", html.length);
    
    const $ = cheerio.load(html);
    console.log("Title of page:", $("title").text());
    
    // Check if it has entry-content or other article text
    const content = $(".entry-content").text().trim();
    console.log("Content preview (first 500 chars):", content.substring(0, 500));
    
    // Check if there are links
    console.log("=== Checking links ===");
    $(".entry-content a").each((i, el) => {
      console.log(`Link ${i + 1}: text="${$(el).text().trim()}" href="${$(el).attr("href")}"`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
