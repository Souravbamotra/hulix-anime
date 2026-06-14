import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Find any input with name or id containing 'id' or 'movie' or 'nonce' or 'seri'
  console.log("Searching for inputs:");
  $("input").each((i, el) => {
    const name = $(el).attr("name") || "";
    const id = $(el).attr("id") || "";
    const val = $(el).attr("value") || "";
    if (name.includes("id") || id.includes("id") || name.includes("nonce") || id.includes("nonce") || name.includes("seri") || id.includes("seri") || id.includes("movie")) {
      console.log(`- name: "${name}", id: "${id}", val: "${val}"`);
    }
  });
  
  // Look for any links containing "-episode-" or "/episode/"
  console.log("\nSearching for episode links:");
  let count = 0;
  $("a").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.includes("-episode-") || href.includes("/episode/") || text.toLowerCase().includes("episode")) {
      count++;
      if (count <= 10) {
        console.log(`- text: "${text}", href: "${href}"`);
      }
    }
  });
  console.log("Total episode links found:", count);
}

test();
