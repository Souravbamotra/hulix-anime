import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/naruto-season-4-hindi-episodes-download-hd/";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("=== Dump content of entry-content ===");
    $(".entry-content").children().each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Episode") || text.includes("EP")) {
        console.log(`\nLine ${i + 1}: [Tag: ${el.name}]`);
        console.log(`Text: "${text}"`);
        const links = [];
        $(el).find("a").each((j, aEl) => {
          links.push({ text: $(aEl).text().trim(), href: $(aEl).attr("href") });
        });
        if (links.length > 0) {
          console.log("Links inside:", links);
        }
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
