import { searchRareAnimes } from "../src/lib/scraper.js";

async function test(query) {
  console.log(`Searching for: "${query}"`);
  const results = await searchRareAnimes(query);
  console.log(`Found ${results.length} results. First 3:`, JSON.stringify(results.slice(0, 3), null, 2));
}

async function run() {
  await test("Dragon Ball Super God of Destruction Beerus Saga");
  await test("Dragon Ball Super Beerus Saga");
  await test("Dragon Ball Super Season 1");
  await test("Dragon Ball Super Arc 1");
}

run();
