import * as cheerio from "cheerio";

async function test() {
  const url = "https://animelok.net/anime/672ec2739d61";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    const $ = cheerio.load(text);
    
    console.log("Searching for 672ec2739d61 inside HTML:");
    // Print occurrences with 100 characters around them
    let index = 0;
    const target = "672ec2739d61";
    while (true) {
      index = text.indexOf(target, index);
      if (index === -1) break;
      console.log(`\nMatch at index ${index}:`);
      console.log(text.substring(Math.max(0, index - 150), Math.min(text.length, index + target.length + 150)));
      index += target.length;
    }
    
    console.log("\nSearching for text blocks or script content containing 'watch':");
    $("script").each((i, el) => {
      const content = $(el).text();
      if (content.includes("watch") || content.includes("episode") || content.includes("One Piece")) {
        console.log(`Script index ${i} length: ${content.length}`);
        if (content.length < 1000) {
          console.log(content);
        } else {
          console.log(content.substring(0, 500) + " ... [TRUNCATED] ... ");
        }
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
