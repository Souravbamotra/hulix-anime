import * as cheerio from "cheerio";

async function test() {
  const url = "https://animelok.net/search?keyword=One+Piece";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    const $ = cheerio.load(text);
    
    console.log("Details of first /anime/ link card:\n");
    const firstCard = $("a[href^='/anime/']").first();
    if (firstCard.length > 0) {
      console.log("HTML:", $.html(firstCard));
    } else {
      console.log("No card found matching a[href^='/anime/']");
    }
    
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
