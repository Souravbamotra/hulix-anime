import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  const queries = ["Naruto Season", "Naruto Episodes", "Naruto Hindi", "Naruto 220"];
  for (const q of queries) {
    console.log(`\n=== Searching for: "${q}" ===`);
    const results = await searchRareAnimes(q);
    console.log(`Found ${results.length} results:`);
    results.forEach(r => console.log(` - Title: "${r.title}" | Slug: "${r.slug}"`));
  }
}

run();
