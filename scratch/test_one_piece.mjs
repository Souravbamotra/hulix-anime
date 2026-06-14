import { findGogoAnimeSlug, getAnimeEpisodes, searchGogoAnime } from "../src/lib/scraper.js";

async function run() {
  console.log("=== Searching GogoAnime for 'One Piece' ===");
  const results = await searchGogoAnime("One Piece");
  console.log("Search results:", JSON.stringify(results, null, 2));

  console.log("\n=== Finding slug for 'One Piece' ===");
  const slug = await findGogoAnimeSlug("One Piece", "One Piece", "TV", false);
  console.log("Mapped slug:", slug);

  if (slug) {
    console.log(`\n=== Fetching episodes for slug: ${slug} ===`);
    const eps = await getAnimeEpisodes(slug);
    console.log(`Found ${eps.length} episodes`);
    if (eps.length > 0) {
      console.log("First episode:", eps[0]);
      console.log("Last episode:", eps[eps.length - 1]);
    }
  }
}

run();
