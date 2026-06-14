import * as cheerio from "cheerio";

const URL = "https://www.rareanimes.mov/hindi/jujutsu-kaisen-season-2-hindi-dubbed-episodes-download-hd/";

async function test() {
  try {
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Printing text of .entry-content:\n");
    console.log($(".entry-content").text().replace(/\n+/g, "\n"));
  } catch (error) {
    console.error(error);
  }
}
test();
