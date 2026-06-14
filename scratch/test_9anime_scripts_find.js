import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/naruto-dub-episode-220/";
  console.log("Fetching episode player page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Find all script tags
  console.log("\nSearching script tags for keywords:");
  $("script").each((i, el) => {
    const js = $(el).text();
    const src = $(el).attr("src") || "";
    if (src) {
      console.log(`- External script: ${src}`);
    } else {
      if (js.includes("Container") || js.includes("pembed") || js.includes("player") || js.includes("click")) {
        console.log(`- Inline script ${i} matches, first 200 chars:`);
        console.log(js.slice(0, 200));
      }
    }
  });
}

test();
