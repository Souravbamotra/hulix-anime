/**
 * Allowlist of hostnames (and their subdomains) that this proxy is permitted
 * to fetch on behalf of the client.  Any URL whose hostname does not match
 * one of these entries is rejected with 403 before a network request is made.
 *
 * Keep this list as narrow as possible — only add a host when you have a
 * concrete need for it.
 */
const ALLOWED_HOSTS = new Set([
  // HLS / TS segment CDNs
  "ibyteimg.com",
  "tiktokv.com",
  // AniDap / argon embed CDN
  "argon.razorshell.space",
  "razorshell.space",
  "anidap.se",
  "chad.anidap.se",
  // 24stream / megaplay / vibeplayer embeds
  "24stream.xyz",
  "megaplay.su",
  "megaplay.buzz",
  "mewstream.buzz",
  "vibeplayer.site",
  // codedew / streambeta / multiquality
  "codedew.com",
  "streambeta.net",
  "multiquality.net",
  // gogoanimes CDN
  "gogoanimes.cv",
  // WatchMultiQuality CDN
  "groovy.monster",
  // Project Scrapers & main domains
  "9anime.org.lv",
  "rareanimes.mov",
  "www.rareanimes.mov",
  "toonstream.vip",
]);

/**
 * Returns true when `hostname` (or any sub-domain of it) is in ALLOWED_HOSTS.
 * e.g. "cdn.24stream.xyz" is accepted because "24stream.xyz" is in the set.
 */
function isAllowedHost(hostname) {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (global.dynamicAllowedHosts && global.dynamicAllowedHosts.has(hostname)) return true;

  // Walk up sub-domain levels: "a.b.c" → check "b.c" → check "c"
  const parts = hostname.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (ALLOWED_HOSTS.has(parent)) return true;
    if (global.dynamicAllowedHosts && global.dynamicAllowedHosts.has(parent)) return true;
  }
  return false;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // --- Security: reject URLs not belonging to known anime sources ---
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }

  // Only allow http(s) — block file://, data://, etc.
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return new Response("Forbidden", { status: 403 });
  }

  if (!isAllowedHost(parsedUrl.hostname)) {
    return new Response("Forbidden", { status: 403 });
  }
  // ------------------------------------------------------------------

  try {
    const range = request.headers.get("range") || request.headers.get("Range");
    
    let referer = "https://argon.razorshell.space/";
    let originHeader = undefined;

    if (url.includes("24stream.xyz") || url.includes("mewstream.buzz")) {
      // The 24stream CDN validates that Origin matches the ?origin= query param.
      // Read it from the URL itself so it always matches what the CDN expects.
      try {
        const parsed = new URL(url);
        const originParam = parsed.searchParams.get("origin");
        if (originParam) {
          const originParsed = new URL(originParam);
          referer = `${originParsed.origin}/`;
          originHeader = originParsed.origin;
        } else {
          referer = "https://megaplay.buzz/";
          originHeader = "https://megaplay.buzz";
        }
      } catch {
        referer = "https://megaplay.buzz/";
        originHeader = "https://megaplay.buzz";
      }
    } else if (url.includes("megaplay") || url.includes("vibeplayer.site")) {
      referer = "https://anidap.se/";
      originHeader = "https://anidap.se";
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Referer": referer
    };

    if (originHeader) {
      headers["Origin"] = originHeader;
    }
    
    if (range) {
      headers["Range"] = range;
    }

    // Forward conditional request headers to upstream
    const ifNoneMatch = request.headers.get("if-none-match") || request.headers.get("If-None-Match");
    if (ifNoneMatch) {
      headers["If-None-Match"] = ifNoneMatch;
    }

    const ifModifiedSince = request.headers.get("if-modified-since") || request.headers.get("If-Modified-Since");
    if (ifModifiedSince) {
      headers["If-Modified-Since"] = ifModifiedSince;
    }

    const res = await fetch(url, { 
      headers,
      signal: request.signal
    });

    // Check for 304 Not Modified response first
    if (res.status === 304) {
      const responseHeaders = {
        "Access-Control-Allow-Origin": "*",
      };
      
      const etag = res.headers.get("etag") || res.headers.get("ETag");
      if (etag) responseHeaders["ETag"] = etag;
      
      const lastModified = res.headers.get("last-modified") || res.headers.get("Last-Modified");
      if (lastModified) responseHeaders["Last-Modified"] = lastModified;

      return new Response(null, {
        status: 304,
        headers: responseHeaders
      });
    }

    if (!res.ok) {
      return new Response(`Failed to fetch: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";

    // Check if it's a playlist (.m3u8)
    if (url.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegURL")) {
      let text = await res.text();
      
      // Get base URL for resolving relative links
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      const lines = text.split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("#")) return trimmed;

        // Resolve relative URL to absolute URL
        let absUrl = trimmed;
        if (!trimmed.startsWith("http")) {
          try {
            absUrl = new URL(trimmed, baseUrl).href;
          } catch (e) {
            return trimmed;
          }
        }

        // Optimization: Do not proxy absolute segment URLs that natively support CORS (like ByteDance/TikTok CDN)
        if (absUrl.includes("ibyteimg.com")) {
          return absUrl;
        }

        // Rewrite to go through our proxy
        const proxyBaseUrl = new URL(request.url).origin + "/api/proxy-stream";
        return `${proxyBaseUrl}?url=${encodeURIComponent(absUrl)}`;
      });

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegURL",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=10"
        }
      });
    }

    // Pipe binary segment file stream directly (with Range support)
    const body = res.body;
    const responseHeaders = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=31536000, immutable", // 1 year cache for immutable TS segments
      "X-Accel-Buffering": "no",
      "Accept-Ranges": "bytes",
      "Connection": "keep-alive"
    };

    const etag = res.headers.get("etag") || res.headers.get("ETag");
    if (etag) responseHeaders["ETag"] = etag;

    const lastModified = res.headers.get("last-modified") || res.headers.get("Last-Modified");
    if (lastModified) responseHeaders["Last-Modified"] = lastModified;

    const contentRange = res.headers.get("content-range") || res.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    const contentLength = res.headers.get("content-length") || res.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    const acceptRanges = res.headers.get("accept-ranges") || res.headers.get("Accept-Ranges");
    if (acceptRanges) {
      responseHeaders["Accept-Ranges"] = acceptRanges;
    }

    return new Response(body, {
      status: res.status, // 206 for partial content range responses
      headers: responseHeaders
    });

  } catch (error) {
    console.error("[Proxy-Stream] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
