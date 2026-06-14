import { findGogoAnimeSlug, getAnimeEpisodes, findRareAnimesSlug, getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function testAll() {
  console.log("=== VERIFYING GOGOANIME SCRAPER & CACHE ===");
  console.log("Run 1: (Could hit or miss cache depending on previous runs)");
  const gogoSlug = await findGogoAnimeSlug("One Piece", "One Piece", "TV", false);
  console.log("GogoAnime Slug:", gogoSlug);
  const gogoEpisodes = await getAnimeEpisodes(gogoSlug);
  console.log(`GogoAnime Episodes count: ${gogoEpisodes.length}`);

  console.log("\nRun 2: (Must be a complete cache hit)");
  const gogoSlugCached = await findGogoAnimeSlug("One Piece", "One Piece", "TV", false);
  const gogoEpisodesCached = await getAnimeEpisodes(gogoSlug);
  console.log(`GogoAnime Slug matched: ${gogoSlugCached === gogoSlug}`);
  console.log(`GogoAnime Episodes count: ${gogoEpisodesCached.length}`);


  console.log("\n=== VERIFYING RAREANIMES SCRAPER & CACHE ===");
  console.log("Run 1: (Could hit or miss cache depending on previous runs)");
  const rareSlug = await findRareAnimesSlug("Naruto", "Naruto", "TV");
  console.log("RareAnimes Slug:", rareSlug);
  const rareEpisodes = await getRareAnimesEpisodes(rareSlug);
  console.log(`RareAnimes Episodes count: ${rareEpisodes.length}`);

  console.log("\nRun 2: (Must be a complete cache hit)");
  const rareSlugCached = await findRareAnimesSlug("Naruto", "Naruto", "TV");
  const rareEpisodesCached = await getRareAnimesEpisodes(rareSlug);
  console.log(`RareAnimes Slug matched: ${rareSlugCached === rareSlug}`);
  console.log(`RareAnimes Episodes count: ${rareEpisodesCached.length}`);

  console.log("\n=== ALL SCRAPER AND CACHING TESTS COMPLETED ===");
}

testAll().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
