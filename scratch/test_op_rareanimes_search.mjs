import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  const results = await searchRareAnimes("One Piece");
  console.log("Search results for 'One Piece':");
  results.forEach(r => console.log(` - "${r.title}" -> "${r.slug}"`));
}

run();
