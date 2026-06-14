import { findRareAnimesSlug, getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function run() {
  console.log("=== Finding RareAnimes Slug for Naruto ===");
  const slug = await findRareAnimesSlug("Naruto", "Naruto", "TV");
  console.log("Mapped slug:", slug);
  
  if (slug) {
    console.log(`\n=== Fetching episodes for slug: ${slug} ===`);
    const eps = await getRareAnimesEpisodes(slug);
    console.log(`Found ${eps.length} episodes`);
    console.log("Episodes list:", eps.map(e => ({ number: e.number, title: e.title })));
  }
}

run();
