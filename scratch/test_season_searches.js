import { searchRareAnimes } from "../src/lib/scraper.js";

async function test(query) {
  console.log(`Searching for: "${query}"`);
  const results = await searchRareAnimes(query);
  if (results.length > 0) {
    console.log(`Top result: Title: "${results[0].title}", Slug: "${results[0].slug}"`);
  } else {
    console.log("No results found.");
  }
}

async function run() {
  for (let i = 1; i <= 5; i++) {
    await test(`Dragon Ball Super Season ${i}`);
  }
}

run();
