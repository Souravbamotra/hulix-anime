import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const episodes = [];
  $(".eplister ul li a").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    // Usually, the text contains the episode number in a child element or directly
    // Let's print out what $(el).html() looks like for the first one
    if (i === 0) {
      console.log("First li a HTML:\n", $(el).html());
      console.log("First li a text:\n", text);
    }
    
    // Extract episode number
    // Text is:
    // 220
    // Naruto (Dub) Episode 220
    // Dub        September 27, 2024
    // Let's find the episode number from the text using a clean regex.
    // e.g. text can have a span class "epl-num" containing "220"
    const numSpan = $(el).find(".epl-num").text().trim();
    const titleSpan = $(el).find(".epl-title").text().trim();
    
    const epNum = parseFloat(numSpan) || i + 1;
    episodes.push({ number: epNum, slug: href, title: titleSpan });
  });
  
  console.log(`\nParsed ${episodes.length} episodes!`);
  console.log("First 3 episodes:", episodes.slice(0, 3));
}

test();
