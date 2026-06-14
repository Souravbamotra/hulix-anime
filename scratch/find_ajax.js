import * as cheerio from "cheerio";

async function test() {
  const url = "https://blazer.raretoonsindia.com/5vW2SJOn";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    $("script").each((i, el) => {
      const text = $(el).text();
      if (text.includes("links/go") || text.includes("goBtn") || text.includes("get-link") || text.includes("form")) {
        console.log(`Script ${i + 1} content:\n`, text);
        console.log("================================");
      }
    });
  } catch (err) {
    console.error(err);
  }
}
test();
