import { searchRareAnimes } from "../src/lib/scraper.js";

async function run() {
  console.log("Searching 'Dragon Ball Super' on RareAnimes...");
  const results = await searchRareAnimes("Dragon Ball Super");
  console.log("Results for 'Dragon Ball Super':", JSON.stringify(results, null, 2));

  console.log("\nSearching 'Beerus Saga' on RareAnimes...");
  const resultsBeerus = await searchRareAnimes("Beerus Saga");
  console.log("Results for 'Beerus Saga':", JSON.stringify(resultsBeerus, null, 2));
}

run();
