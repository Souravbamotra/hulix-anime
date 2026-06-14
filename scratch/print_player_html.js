import * as cheerio from "cheerio";
import fs from "fs";

const URL = "https://codedew.com/zipper/?url=dIWQdtAqm%2FOJaDqDhsx4UcWPbe2cbs8zOkhT1htqCt74Kv2grJP6FQZB3ozER1M5%2B0DuEBPmbGRhYKVeq%2FM4j7%2FR%2BdWikeym9XncNOkW0d9MrQ%3D%3D";

async function test() {
  try {
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    fs.writeFileSync("scratch/player.html", html);
    console.log("Saved player HTML to scratch/player.html");
    
    const $ = cheerio.load(html);
    console.log("Iframes found on page:");
    $("iframe").each((i, el) => {
      console.log(`Iframe ${i + 1}: src="${$(el).attr("src")}" id="${$(el).attr("id") || ""}"`);
    });
    
    console.log("\nVideo elements found on page:");
    $("video").each((i, el) => {
      console.log(`Video ${i + 1}: src="${$(el).attr("src")}"`);
    });
    
    console.log("\nScript tags containing stream urls or player configs:");
    $("script").each((i, el) => {
      const text = $(el).text();
      if (text.includes("m3u8") || text.includes("mp4") || text.includes("player") || text.includes("source") || text.includes("file")) {
        console.log(`Script ${i + 1} length: ${text.length}`);
        console.log(text.substring(0, 1000));
        console.log("--------------------------------");
      }
    });
  } catch (error) {
    console.error(error);
  }
}
test();
