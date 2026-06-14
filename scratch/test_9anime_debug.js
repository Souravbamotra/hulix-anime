import { searchGogoAnime, findGogoAnimeSlug, getAnimeEpisodes, getEpisodeServers } from "../src/lib/scraper.js";

async function run() {
  // Test 1: Search for Solo Leveling (or any popular anime)
  console.log("=== Test: Search 9anime ===");
  const results = await searchGogoAnime("Solo Leveling");
  console.log("Search results:", JSON.stringify(results.slice(0, 3), null, 2));

  // Test 2: Find sub slug
  console.log("\n=== Test: Find Sub Slug ===");
  const subSlug = await findGogoAnimeSlug("Ore dake Level Up na Ken", "Solo Leveling", "TV", false);
  console.log("Sub slug:", subSlug);

  // Test 3: Find dub slug
  console.log("\n=== Test: Find Dub Slug ===");
  const dubSlug = await findGogoAnimeSlug("Ore dake Level Up na Ken", "Solo Leveling", "TV", true);
  console.log("Dub slug:", dubSlug);

  // Test 4: Get episodes from sub slug
  if (subSlug) {
    console.log("\n=== Test: Sub Episodes ===");
    const eps = await getAnimeEpisodes(subSlug);
    console.log(`Found ${eps.length} sub episodes. First 3:`, JSON.stringify(eps.slice(0, 3), null, 2));

    // Test 5: Get servers for first sub episode
    if (eps.length > 0) {
      console.log("\n=== Test: Sub Episode Servers ===");
      console.log(`Fetching servers for: ${eps[0].slug}`);
      const servers = await getEpisodeServers(eps[0].slug);
      console.log("Servers:", JSON.stringify(servers, null, 2));
    }
  }

  // Test 6: Get episodes from dub slug
  if (dubSlug) {
    console.log("\n=== Test: Dub Episodes ===");
    const eps = await getAnimeEpisodes(dubSlug);
    console.log(`Found ${eps.length} dub episodes. First 3:`, JSON.stringify(eps.slice(0, 3), null, 2));

    if (eps.length > 0) {
      console.log("\n=== Test: Dub Episode Servers ===");
      console.log(`Fetching servers for: ${eps[0].slug}`);
      const servers = await getEpisodeServers(eps[0].slug);
      console.log("Servers:", JSON.stringify(servers, null, 2));
    }
  }
}

run().catch(console.error);
