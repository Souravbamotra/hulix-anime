import fs from "fs";
import * as cheerio from "cheerio";

function test() {
  const html = fs.readFileSync("scratch/player.html", "utf8");
  const $ = cheerio.load(html);
  
  $("script").each((i, el) => {
    const text = $(el).text();
    if (text.includes("playerSources")) {
      const lines = text.split("\n");
      console.log("Onload block lines:");
      for (let j = 300; j < Math.min(lines.length, 340); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
    }
  });
}
test();
