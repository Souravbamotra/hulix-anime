import * as cheerio from "cheerio";

async function test() {
  const url = "https://www.rareanimes.mov/hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series/";
  console.log("Fetching Dragon Ball Super page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const links = [];
  $(".entry-content a").each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (href && (text.toLowerCase().includes("arc") || text.toLowerCase().includes("saga") || text.toLowerCase().includes("season"))) {
      links.push({ text, href });
    }
  });
  
  console.log("Found links:", links);
  
  for (const link of links) {
    console.log(`\nFetching ${link.text}...`);
    try {
      const subRes = await fetch(link.href, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Referer": url
        }
      });
      console.log("Status:", subRes.status);
      console.log("Redirected URL:", subRes.url);
    } catch (err) {
      console.error("Error fetching link:", err.message);
    }
  }
}

test();
