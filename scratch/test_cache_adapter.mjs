import { getCacheKey, getCache, setCache } from "../src/lib/cache.js";
import fs from "node:fs";
import path from "node:path";

async function testCache() {
  console.log("=== Testing Cache Adapter ===");

  const testKey = getCacheKey("test_prefix", "Anime Title (Sub)");
  console.log(`Generated cache key: ${testKey}`);

  // 1. Verify Cache Miss
  console.log("\n1. Verifying Cache Miss...");
  const cachedVal = await getCache(testKey);
  console.log(`Initial read result (should be null):`, cachedVal);
  if (cachedVal !== null) {
    throw new Error("Expected initial cache read to be null!");
  }

  // 2. Verify Cache Write
  console.log("\n2. Verifying Cache Write...");
  const testData = {
    title: "Anime Title (Sub)",
    episodes: [
      { id: "episode-1", number: 1, title: "Episode 1" },
      { id: "episode-2", number: 2, title: "Episode 2" }
    ],
    timestamp: Date.now()
  };
  await setCache(testKey, testData);
  console.log("Data written to cache successfully.");

  // 3. Verify Cache Hit
  console.log("\n3. Verifying Cache Hit...");
  const readData = await getCache(testKey);
  console.log("Read data from cache:", readData);
  if (!readData || readData.title !== testData.title) {
    throw new Error("Cache hit verification failed!");
  }
  console.log("Cache hit verified successfully!");

  // 4. Verify Local Filesystem File is Created (fallback check if GCS not configured)
  const isGcs = process.env.GCS_BUCKET_NAME && (
    (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  if (!isGcs) {
    console.log("\n4. Checking Local File System Cache Fallback...");
    const localCachePath = path.join(process.cwd(), "cache", `${testKey}.json`);
    console.log(`Looking for local file at: ${localCachePath}`);
    if (fs.existsSync(localCachePath)) {
      console.log("Local cache file exists and contains:", fs.readFileSync(localCachePath, "utf-8"));
      
      // Cleanup test file
      fs.unlinkSync(localCachePath);
      console.log("Cleaned up local test cache file.");
    } else {
      throw new Error("Expected local cache file does not exist!");
    }
  } else {
    console.log("\n4. Running with Google Cloud Storage integration active. Skipping local filesystem file checks.");
  }

  console.log("\n=== Cache Adapter Test Passed! ===");
}

testCache().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
