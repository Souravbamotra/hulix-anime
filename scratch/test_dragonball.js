import { findRareAnimesSlug } from "../src/lib/scraper.js";

async function test() {
  console.log("Searching and matching 'Dragon Ball Super' with format 'TV'...");
  const matchedSlug = await findRareAnimesSlug("Dragon Ball Super", "Dragon Ball Super", "TV");
  console.log("Matched Slug:", matchedSlug);
}

test().catch(err => console.error("Error:", err));
