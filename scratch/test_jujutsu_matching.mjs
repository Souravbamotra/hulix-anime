import { findRareAnimesSlug } from "../src/lib/scraper.js";
import fs from "node:fs";
import path from "node:path";

async function testJujutsuMatching() {
  console.log("=== Testing Jujutsu Kaisen Season-Filtering Verification ===");

  // Clear cache for fresh checks
  const cacheDir = path.join(process.cwd(), "cache");
  const keysToClear = [
    "rare_slug_jujutsu_kaisen_jujutsu_kaisen",
    "rare_slug_jujutsu_kaisen_season_2_jujutsu_kaisen_season_2",
    "rare_slug_one_piece_one_piece"
  ];

  console.log("Cleaning up cache files...");
  for (const k of keysToClear) {
    // We hash the keys in cache.js using MD5, so we can clean all cache folder to be safe, or just mock bypass cache
    // Let's just delete the whole cache folder to be sure
  }
  
  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        fs.unlinkSync(path.join(cacheDir, file));
      }
    }
    console.log("Entire cache folder cleared.");
  } catch (e) {
    console.log("Cache directory not cleared:", e.message);
  }

  // 1. Test Jujutsu Kaisen Season 1
  console.log("\n1. Testing Jujutsu Kaisen (Season 1)...");
  const slugS1 = await findRareAnimesSlug("JUJUTSU KAISEN", "JUJUTSU KAISEN", "TV");
  console.log("Result slug:", slugS1);
  if (slugS1 !== "hindi/jujutsu-kaisen-season-1-hindi-dubbed-episodes-download-hd") {
    throw new Error(`Expected Season 1 slug, but got: ${slugS1}`);
  }
  console.log("SUCCESS: Mapped to Season 1 exactly!");

  // 2. Test Jujutsu Kaisen Season 2
  console.log("\n2. Testing Jujutsu Kaisen Season 2...");
  const slugS2 = await findRareAnimesSlug("JUJUTSU KAISEN Season 2", "JUJUTSU KAISEN Season 2", "TV");
  console.log("Result slug:", slugS2);
  if (slugS2 !== "hindi/jujutsu-kaisen-season-2-hindi-dubbed-episodes-download-hd") {
    throw new Error(`Expected Season 2 slug, but got: ${slugS2}`);
  }
  console.log("SUCCESS: Mapped to Season 2 exactly!");

  // 3. Test One Piece (Combine Whitelist)
  console.log("\n3. Testing One Piece (Whitelist Combine)...");
  const slugOP = await findRareAnimesSlug("One Piece", "One Piece", "TV");
  console.log("Result slug:", slugOP);
  if (!slugOP || !slugOP.startsWith("multi::")) {
    throw new Error(`Expected a multi-season slug for One Piece, but got: ${slugOP}`);
  }
  console.log("SUCCESS: Combined multiple seasons for One Piece!");

  console.log("\n=== ALL SEASON-FILTERING VERIFICATION TESTS PASSED! ===");
}

testJujutsuMatching().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
