import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/naruto-dub-episode-220/";
  console.log("Fetching episode player page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Look for any elements containing "server" or "choose" or tabs
  console.log("\nSearching for server elements:");
  $("*").each((i, el) => {
    const id = $(el).attr("id") || "";
    const cls = $(el).attr("class") || "";
    if (id.includes("server") || cls.includes("server") || id.includes("player") || cls.includes("player")) {
      const tag = $(el).prop("tagName");
      // Print tag and first 200 characters of text/HTML if it has no children of the same match
      if ($(el).find("[id*='server'], [class*='server'], [id*='player'], [class*='player']").length === 0) {
        console.log(`- Tag: ${tag}, id: "${id}", class: "${cls}", text: "${$(el).text().trim().slice(0, 100)}", HTML snippet: "${$(el).html()?.slice(0, 100)}..."`);
      }
    }
  });
}

test();
