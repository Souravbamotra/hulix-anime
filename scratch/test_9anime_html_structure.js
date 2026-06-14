import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Find where episode 220 link is located and print its parent container's outer HTML
  const link = $("a[href*='naruto-dub-episode-220']").first();
  if (link.length > 0) {
    console.log("Found episode 220 link!");
    console.log("\nParent outer HTML:");
    console.log(link.parent().html());
    console.log("\nGrandparent outer HTML:");
    console.log(link.parent().parent().html()?.slice(0, 1500));
  } else {
    console.log("Episode 220 link not found!");
  }
}

test();
