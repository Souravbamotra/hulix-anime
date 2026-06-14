import * as cheerio from "cheerio";

async function test() {
  const url = "https://blazer.raretoonsindia.com/5vW2SJOn";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("External scripts:");
    $("script[src]").each((i, el) => {
      console.log(`Script ${i + 1}: src="${$(el).attr("src")}"`);
    });
  } catch (err) {
    console.error(err);
  }
}
test();
