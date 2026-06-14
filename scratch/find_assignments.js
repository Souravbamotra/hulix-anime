import fs from "fs";
import * as cheerio from "cheerio";

function test() {
  const html = fs.readFileSync("scratch/player.html", "utf8");
  const $ = cheerio.load(html);
  
  $("script").each((i, el) => {
    const text = $(el).text();
    if (text.includes("playerSources")) {
      console.log(`Script ${i + 1} contains playerSources:`);
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        if (line.includes("playerSources")) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
}
test();
