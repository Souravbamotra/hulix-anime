import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  let printed = 0;
  $("a").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.includes("-episode-") || href.includes("/episode/")) {
      printed++;
      if (printed <= 20) {
        // Print the tag, its parent tags up to 3 levels, and the outer HTML
        const parents = [];
        let p = $(el).parent();
        for (let j = 0; j < 3; j++) {
          if (p.length > 0) {
            parents.push(p.prop("tagName") + (p.attr("class") ? "." + p.attr("class").split(" ").join(".") : "") + (p.attr("id") ? "#" + p.attr("id") : ""));
            p = p.parent();
          }
        }
        console.log(`\nLink ${printed}: text: "${text}", href: "${href}"`);
        console.log(`- Path: ${parents.reverse().join(" > ")}`);
      }
    }
  });
}

test();
