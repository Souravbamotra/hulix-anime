import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  const query = "Dragon Ball Super God of Destruction Beerus Saga";
  console.log(`Searching for: "${query}"`);
  const results = await searchRareAnimes(query);
  console.log("All results:");
  results.forEach((r, i) => {
    console.log(`${i + 1}. Title: "${r.title}", Slug: "${r.slug}"`);
  });
}

run();
