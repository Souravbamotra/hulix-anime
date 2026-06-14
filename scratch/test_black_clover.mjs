import { findRareAnimesSlug, getRareAnimesEpisodes } from "../src/lib/scraper.js";
import fs from "node:fs";
import path from "node:path";

async function run() {
  console.log("=== Testing Black Clover Dub Scraping Fix ===");

  // Clear cache first to force live fetch
  const cacheDir = path.join(process.cwd(), "cache");
  try {
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(cacheDir, file));
        }
      }
      console.log("Hashed caches cleared successfully.");
    }
  } catch (e) {
    console.error("Cache clean failed:", e.message);
  }

  // 1. Resolve Slug (should combine Season 1 and Season 2 Hindi Dubbed)
  console.log("\n1. Resolving Black Clover slug...");
  const slug = await findRareAnimesSlug("Black Clover", "Black Clover", "TV");
  console.log("Resolved Slug:", slug);
  if (!slug || !slug.startsWith("multi::")) {
    throw new Error(`Expected a multi:: combined slug for Black Clover, but got: ${slug}`);
  }
  if (slug.includes("black-clover-episodes-hindi-subbed-download-fhd")) {
    throw new Error("FAIL: Subbed page matched instead of Dubbed pages!");
  }
  console.log("SUCCESS: Mapped to correct Hindi Dubbed season slugs!");

  // 2. Fetch and Compile Episodes
  console.log("\n2. Fetching combined episode list...");
  const episodes = await getRareAnimesEpisodes(slug);
  console.log(`SUCCESS: Compiled ${episodes.length} episodes total.`);

  if (episodes.length !== 52) {
    throw new Error(`Expected 52 episodes (51 from Season 1 + 1 from Season 2), but got: ${episodes.length}`);
  }

  console.log("\n--- Episode Checks ---");
  console.log("First episode (Season 1 Episode 1) absolute number:", episodes[0].number);
  console.log("Last episode of Season 1 (Episode 51) absolute number:", episodes[50].number);
  console.log("First episode of Season 2 (Episode 1) absolute number (should be 52):", episodes[51].number);

  if (episodes[0].number !== 1 || episodes[50].number !== 51) {
    throw new Error("Season 1 renumbering mismatch!");
  }
  if (episodes[51].number !== 52) {
    throw new Error(`Season 2 Episode 1 renumbering mismatch! Expected 52, got: ${episodes[51].number}`);
  }

  console.log("\n=== ALL BLACK CLOVER SCRAPER TESTS PASSED! ===");
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
