import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  const query = "Dragon Ball Super Arc 1 – God of Destruction Beerus Saga";
  console.log(`Searching for: "${query}"`);
  const results = await searchRareAnimes(query);
  console.log("Results:", JSON.stringify(results, null, 2));
}

run();
