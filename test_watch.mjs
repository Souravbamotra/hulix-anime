import * as cheerio from "cheerio";

async function test() {
  const url = "https://animelok.net/watch/one-piece-21";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    const $ = cheerio.load(text);
    
    console.log("Page title:", $("title").text());
    console.log("Main container text preview (first 500 chars):");
    console.log($("main").text().trim().replace(/\s+/g, " ").substring(0, 500));
    
    console.log("\nSearching for any text containing 'Episode' or 'Server':");
    $("*").each((i, el) => {
      const textVal = $(el).text().trim();
      const name = el.name;
      if ((name === "h1" || name === "h2" || name === "h3" || name === "span" || name === "button" || name === "p") && 
          (textVal.includes("Episode") || textVal.includes("Server") || textVal.includes("Hindi") || textVal.includes("Sub"))) {
        console.log(`Tag: <${name}>, Text: "${textVal.substring(0, 100)}"`);
      }
    });
    
    // Dump script self.__next_f pushes
    console.log("\nNext.js flight script content pushes:");
    $("script").each((i, el) => {
      const content = $(el).text();
      if (content.includes("self.__next_f.push")) {
        console.log(`Script index ${i} length: ${content.length}`);
        if (content.includes("one-piece")) {
          console.log(`Contains 'one-piece':`, content.substring(0, 300));
        }
      }
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
