import * as cheerio from "cheerio";

const BASE_URL = "https://www.rareanimes.mov";

async function test() {
  try {
    const url = `${BASE_URL}/?s=Jujutsu+Kaisen`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const firstArticle = $("article").first();
    console.log("HTML of first article element:\n");
    console.log($.html(firstArticle));
  } catch (error) {
    console.error(error);
  }
}
test();
