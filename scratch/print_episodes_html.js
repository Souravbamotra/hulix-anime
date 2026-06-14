import * as cheerio from "cheerio";

const URL = "https://www.rareanimes.mov/hindi/jujutsu-kaisen-season-2-hindi-dubbed-episodes-download-hd/";

async function test() {
  try {
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Find all blocks that contain "Episode 01" or "Episode 1" or similar
    console.log("Printing blocks with 'Episode':\n");
    
    $("p, div, h4, h5").each((i, el) => {
      const text = $(el).text();
      if (text.includes("Episode") && $(el).find("a").length > 0) {
        console.log(`-- Element <${el.name}> containing 'Episode':`);
        console.log($.html(el));
        console.log("------------------------------------------");
      }
    });
  } catch (error) {
    console.error(error);
  }
}
test();
