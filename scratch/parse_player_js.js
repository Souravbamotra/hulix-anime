import fs from "fs";
import * as cheerio from "cheerio";

function test() {
  try {
    const html = fs.readFileSync("scratch/player.html", "utf8");
    const $ = cheerio.load(html);
    
    $("script").each((i, el) => {
      const text = $(el).text();
      if (text.includes("playerSources") || text.includes("_x_") || text.includes("atob")) {
        console.log(`Script ${i + 1} contains target keywords. Length: ${text.length}`);
        
        // Let's look for playerSources assignments, array pushes, or URLs
        const lines = text.split("\n");
        console.log("Found lines:");
        lines.forEach((line, idx) => {
          if (line.includes("playerSources") || line.includes("fileId") || line.includes("src") || line.includes("http") || line.includes("url")) {
            if (line.length < 500) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            } else {
              console.log(`  Line ${idx + 1}: ${line.trim().substring(0, 500)}... [TRUNCATED]`);
            }
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
  }
}
test();
