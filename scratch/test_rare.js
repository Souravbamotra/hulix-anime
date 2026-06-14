import { searchRareAnimes, findRareAnimesSlug } from "../src/lib/scraper.js";

async function test() {
  console.log("Searching RareAnimes for 'Dragon Ball Super'...");
  const searchResults = await searchRareAnimes("Dragon Ball Super");
  console.log("Search Results:", JSON.stringify(searchResults, null, 2));

  console.log("\nAttempting match using findRareAnimesSlug...");
  const matchedSlug = await findRareAnimesSlug("Dragon Ball Super", "Dragon Ball Super");
  console.log("Matched Slug:", matchedSlug);
}

test().catch(err => console.error("Error:", err));
