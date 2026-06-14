import { getAnimeEpisodes } from "../src/lib/scraper.js";

async function testMainOnePiece() {
  console.log("=== Testing 'anime/one-piece' ===");
  const eps = await getAnimeEpisodes("anime/one-piece");
  console.log(`Found ${eps.length} episodes for 'anime/one-piece'`);
  if (eps.length > 0) {
    console.log("First episode:", eps[0]);
    console.log("Last episode:", eps[eps.length - 1]);
  }
}

testMainOnePiece();
