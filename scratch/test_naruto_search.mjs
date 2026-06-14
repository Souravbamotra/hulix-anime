import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  const results = await searchRareAnimes("Naruto");
  console.log("Search results for 'Naruto':", JSON.stringify(results, null, 2));
}

run();
