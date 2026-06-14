import fs from "fs";
import * as cheerio from "cheerio";

function test() {
  const html = fs.readFileSync("scratch/player.html", "utf8");
  const $ = cheerio.load(html);
  
  $("script").each((i, el) => {
    const text = $(el).text();
    if (text.includes("player_sources") && text.includes("fileId")) {
      console.log(`Script ${i + 1} match!`);
      const lines = text.split("\n");
      const idx = lines.findIndex(l => l.includes("player_sources") && l.includes("fileId") || l.includes("JSON.stringify({ fileId"));
      if (idx !== -1) {
        console.log(`Lines around index ${idx + 1}:`);
        for (let j = Math.max(0, idx - 15); j < Math.min(lines.length, idx + 20); j++) {
          console.log(`${j + 1}: ${lines[j]}`);
        }
      }
    }
  });
}
test();
