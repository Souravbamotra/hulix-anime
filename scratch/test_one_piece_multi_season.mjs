import { findRareAnimesSlug, getRareAnimesEpisodes } from "../src/lib/scraper.js";
import fs from "node:fs";
import path from "node:path";

async function testMultiSeason() {
  console.log("=== Testing One Piece Multi-Season Scraper Integration ===");

  // Clear existing cache for One Piece to force fresh scrape
  const slugCacheKey = "rare_slug_one_piece_one_piece";
  const epsCacheKey1 = "rare_eps_hindi_one-piece-season-01-episodes-hindi-dubbed-download-hd";
  const epsCacheKey20 = "rare_eps_hindi_one-piece-season-20-episodes-hindi-dubbed-download-hd";
  const epsCacheKey22 = "rare_eps_hindi_one-piece-season-22-episodes-hindi-dubbed-download-hd";
  const combinedCacheKey = "rare_eps_multi_1__hindi_one-piece-season-01-episodes-hindi-dubbed-download-hd__20__hindi_one-piece-season-20-episodes-hindi-dubbed-download-hd__22__hindi_one-piece-season-22-episodes-hindi-dubbed-download-hd";

  const cacheDir = path.join(process.cwd(), "cache");
  const keysToClear = [slugCacheKey, epsCacheKey1, epsCacheKey20, epsCacheKey22, combinedCacheKey];

  console.log("Cleaning up cache files for fresh verification...");
  for (const k of keysToClear) {
    const f = path.join(cacheDir, `${k}.json`);
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`Cleared: ${f}`);
    }
  }

  // 1. Resolve Slug
  console.log("\n1. Finding slug for One Piece on RareAnimes...");
  const slug = await findRareAnimesSlug("One Piece", "One Piece", "TV");
  console.log(`Resolved Slug:`, slug);

  if (!slug || !slug.startsWith("multi::")) {
    throw new Error(`Expected a multi:: slug, but got: ${slug}`);
  }
  console.log("SUCCESS: Resolved combined multi-season slug!");

  // 2. Fetch Combined Episodes
  console.log("\n2. Scraping and compiling episodes across all matching seasons...");
  const episodes = await getRareAnimesEpisodes(slug);
  console.log(`SUCCESS: Found ${episodes.length} total episodes.`);

  if (episodes.length === 0) {
    throw new Error("No episodes compiled!");
  }

  // Check structure and renumbering
  const s1Eps = episodes.filter(e => e.slug.includes("season-01"));
  const s20Eps = episodes.filter(e => e.slug.includes("season-20"));
  const s22Eps = episodes.filter(e => e.slug.includes("season-22"));

  console.log("\n--- Breakdown of Compiled Episodes ---");
  console.log(`Season 1 Episodes: ${s1Eps.length} (Expected 61)`);
  console.log(`Season 20 Episodes: ${s20Eps.length} (Expected 85)`);
  console.log(`Season 22 Episodes: ${s22Eps.length} (Expected 66)`);

  console.log("\n--- Verifying Renumbering & Offsets ---");
  console.log("Season 1 First Episode number (should be 1):", s1Eps[0].number);
  console.log("Season 1 Last Episode number (should be 61):", s1Eps[s1Eps.length - 1].number);

  console.log("Season 20 First Episode number (should be 892):", s20Eps[0].number);
  console.log("Season 20 Last Episode number (should be 976):", s20Eps[s20Eps.length - 1].number);

  console.log("Season 22 First Episode number (should be 1089):", s22Eps[0].number);
  console.log("Season 22 Last Episode number (should be 1154):", s22Eps[s22Eps.length - 1].number);

  // Assertions
  if (s1Eps[0].number !== 1 || s1Eps[s1Eps.length - 1].number !== 61) {
    throw new Error("Season 1 offset mapping failed!");
  }
  if (s20Eps[0].number !== 892 || s20Eps[s20Eps.length - 1].number !== 976) {
    throw new Error("Season 20 offset mapping failed!");
  }
  if (s22Eps[0].number !== 1089 || s22Eps[s22Eps.length - 1].number !== 1154) {
    throw new Error("Season 22 offset mapping failed!");
  }

  console.log("\n=== ALL MULTI-SEASON SCRAPER TESTS PASSED! ===");
}

testMultiSeason().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
