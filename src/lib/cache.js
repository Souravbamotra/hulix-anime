import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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

import { createHash } from "node:crypto";

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

/**
 * Returns clean cache key slug
 */
export function getCacheKey(prefix, val) {
  const hash = createHash("md5").update(val).digest("hex");
  return `${prefix}_${hash}`;
}

/**
 * Retrieve cached JSON data (async)
 */
export async function getCache(key) {
  if (gcsBucket) {
    try {
      const file = gcsBucket.file(`${key}.json`);
      const [exists] = await file.exists();
      if (exists) {
        const [metadata] = await file.getMetadata();
        const updatedTime = new Date(metadata.updated).getTime();
        const isExpired = Date.now() - updatedTime > CACHE_TTL;
        
        if (!isExpired) {
          console.log(`[Cache] GCS cache hit for key: ${key}`);
          const [content] = await file.download();
          return JSON.parse(content.toString("utf-8"));
        } else {
          console.log(`[Cache] GCS item expired for key: ${key}`);
          file.delete().catch(() => {}); // cleanup in background
        }
      } else {
        console.log(`[Cache] GCS cache miss for key: ${key}`);
      }
    } catch (e) {
      console.warn("[Cache] Error reading GCS cache for key:", key, e.message);
    }
    return null;
  }

  // Filesystem fallback
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const isExpired = Date.now() - stats.mtimeMs > CACHE_TTL;
      if (!isExpired) {
        console.log(`[Cache] File cache hit for key: ${key}`);
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      } else {
        console.log(`[Cache] File cache expired for key: ${key}`);
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
    } else {
      console.log(`[Cache] File cache miss for key: ${key}`);
    }
  } catch (e) {
    console.warn("[Cache] Error reading file cache for key:", key, e.message);
  }
  return null;
}

/**
 * Store JSON data to cache (async)
 */
export async function setCache(key, val) {
  if (gcsBucket) {
    try {
      console.log(`[Cache] Writing cache to GCS for key: ${key}`);
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
    console.log(`[Cache] Writing cache to file for key: ${key}`);
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(val), "utf-8");
  } catch (e) {
    console.warn("[Cache] Error writing file cache for key:", key, e.message);
  }
}
