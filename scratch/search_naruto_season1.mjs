import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  console.log("=== Searching for 'Naruto Season 1' ===");
  const results = await searchRareAnimes("Naruto Season 1");
  results.forEach(r => console.log(` - "${r.title}" -> "${r.slug}"`));
}

run();
