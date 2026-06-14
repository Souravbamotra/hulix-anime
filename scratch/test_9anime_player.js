import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/naruto-dub-episode-220/";
  console.log("Fetching episode player page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("Page title:", $("title").text());
  
  // In AnimeStream theme, the servers are listed under .player-type-link or inside div.player-embed
  console.log("\nChecking for player server list elements:");
  const selectors = [".player-type-link", "#w-servers", ".servers", ".player-embed", "iframe", "a[data-video]"];
  selectors.forEach(sel => {
    console.log(`- Selector "${sel}" count: ${$(sel).length}`);
  });
  
  // Print outer HTML of first player-embed or iframe
  if ($(".player-embed").length > 0) {
    console.log("\n--- .player-embed inner HTML: ---");
    console.log($(".player-embed").html());
  } else if ($("iframe").length > 0) {
    console.log("\n--- First iframe outer HTML: ---");
    console.log($("iframe").first().prop("outerHTML"));
  }
}

test();
