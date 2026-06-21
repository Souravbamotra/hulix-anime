import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";

// ─── In-Memory LRU Cache (L1) ───────────────────────────────────────────────
// Fast first-layer cache that eliminates GCS/filesystem round-trips for hot data.
// Uses a Map with LRU eviction — Map preserves insertion order, so we delete+re-set
// on access to move items to the "most recently used" end.

const LRU_MAX_SIZE = 500;
const memoryCache = new Map(); // key → { data, expiresAt }

let cacheStats = { memHit: 0, memMiss: 0, l2Hit: 0, l2Miss: 0 };

function lruGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) {
    cacheStats.memMiss++;
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    cacheStats.memMiss++;
    return undefined;
  }
  // Move to end (most recently used)
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  cacheStats.memHit++;
  return entry.data;
}

function lruSet(key, data, ttlMs) {
  // Evict oldest entries if at capacity
  if (memoryCache.size >= LRU_MAX_SIZE) {
    // Map.keys().next() gives the oldest (least recently used) key
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Log cache stats every 5 minutes (non-blocking)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const total = cacheStats.memHit + cacheStats.memMiss;
    if (total > 0) {
      const hitRate = ((cacheStats.memHit / total) * 100).toFixed(1);
      console.log(
        `[Cache Stats] Memory: ${cacheStats.memHit} hits / ${cacheStats.memMiss} misses (${hitRate}% hit rate) | L2: ${cacheStats.l2Hit} hits / ${cacheStats.l2Miss} misses | LRU size: ${memoryCache.size}`
      );
    }
    // Reset stats each interval
    cacheStats = { memHit: 0, memMiss: 0, l2Hit: 0, l2Miss: 0 };
  }, 5 * 60 * 1000);
}

// ─── GCS Backend (L2) ───────────────────────────────────────────────────────

let gcsBucket = null;

// Read GCS environment variables
const bucketName = process.env.GCS_BUCKET_NAME;
const projectId = process.env.GCS_PROJECT_ID;
const clientEmail = process.env.GCS_CLIENT_EMAIL;
let privateKey = process.env.GCS_PRIVATE_KEY;

const hasGcsCredentials = (projectId && clientEmail && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (bucketName && hasGcsCredentials) {
  try {
    const storageOptions = {};
    if (projectId && clientEmail && privateKey) {
      storageOptions.projectId = projectId;
      storageOptions.credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      };
    }
    const storage = new Storage(storageOptions);
    gcsBucket = storage.bucket(bucketName);
    console.log(`[Cache] Google Cloud Storage adapter initialized with bucket: ${bucketName}`);
  } catch (e) {
    console.error("[Cache] Failed to initialize Google Cloud Storage client:", e.message);
  }
}

// Local filesystem configurations as fallback
const CACHE_DIR = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join(os.tmpdir(), "hulix-cache")
  : path.join(process.cwd(), "cache");

// Ensure local cache directory exists if GCS is not used
if (!gcsBucket) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    console.log("[Cache] Local filesystem cache initialized at:", CACHE_DIR);
  } catch (e) {
    console.error("[Cache] Failed to create local cache directory:", e.message);
  }
}

// ─── Default TTL ─────────────────────────────────────────────────────────────

const DEFAULT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

/**
 * Returns clean cache key slug
 */
export function getCacheKey(prefix, val) {
  const hash = createHash("md5").update(val).digest("hex");
  return `${prefix}_${hash}`;
}

/**
 * Retrieve cached JSON data (async)
 * Checks L1 (memory) first, then L2 (GCS/filesystem).
 * On L2 hit, promotes to L1 for future fast access.
 * 
 * @param {string} key - Cache key
 * @param {number} [ttlMs] - Optional TTL override for L2 expiry check (defaults to 6h)
 */
export async function getCache(key, ttlMs = DEFAULT_CACHE_TTL) {
  // L1: In-memory LRU
  const memResult = lruGet(key);
  if (memResult !== undefined) {
    return memResult;
  }

  // L2: GCS or filesystem
  let l2Data = null;

  if (gcsBucket) {
    try {
      const file = gcsBucket.file(`${key}.json`);
      const [exists] = await file.exists();
      if (exists) {
        const [metadata] = await file.getMetadata();
        const updatedTime = new Date(metadata.updated).getTime();
        const isExpired = Date.now() - updatedTime > ttlMs;
        
        if (!isExpired) {
          const [content] = await file.download();
          l2Data = JSON.parse(content.toString("utf-8"));
          cacheStats.l2Hit++;
        } else {
          cacheStats.l2Miss++;
          file.delete().catch(() => {}); // cleanup in background
        }
      } else {
        cacheStats.l2Miss++;
      }
    } catch (e) {
      console.warn("[Cache] Error reading GCS cache for key:", key, e.message);
      cacheStats.l2Miss++;
    }
  } else {
    // Filesystem fallback
    try {
      const filePath = path.join(CACHE_DIR, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const isExpired = Date.now() - stats.mtimeMs > ttlMs;
        if (!isExpired) {
          const data = fs.readFileSync(filePath, "utf-8");
          l2Data = JSON.parse(data);
          cacheStats.l2Hit++;
        } else {
          cacheStats.l2Miss++;
          try {
            fs.unlinkSync(filePath);
          } catch (_) {}
        }
      } else {
        cacheStats.l2Miss++;
      }
    } catch (e) {
      console.warn("[Cache] Error reading file cache for key:", key, e.message);
      cacheStats.l2Miss++;
    }
  }

  // Promote L2 hit to L1
  if (l2Data !== null) {
    lruSet(key, l2Data, ttlMs);
  }

  return l2Data;
}

/**
 * Store JSON data to cache (async)
 * Writes to both L1 (memory) and L2 (GCS/filesystem).
 * 
 * @param {string} key - Cache key
 * @param {*} val - Data to cache (must be JSON-serializable)
 * @param {number} [ttlMs] - Optional TTL override (defaults to 6h)
 */
export async function setCache(key, val, ttlMs = DEFAULT_CACHE_TTL) {
  // L1: Always write to memory
  lruSet(key, val, ttlMs);

  // L2: GCS or filesystem
  if (gcsBucket) {
    try {
      const file = gcsBucket.file(`${key}.json`);
      await file.save(JSON.stringify(val), {
        contentType: "application/json",
        resumable: false,
      });
      return;
    } catch (e) {
      console.warn("[Cache] Error writing GCS cache for key:", key, e.message);
    }
  }

  // Filesystem fallback
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(val), "utf-8");
  } catch (e) {
    console.warn("[Cache] Error writing file cache for key:", key, e.message);
  }
}
