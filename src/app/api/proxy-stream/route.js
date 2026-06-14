import { fetch, Agent } from "undici";

const undiciAgent = new Agent({
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 60000,
  connections: 200,
  pipelining: 5
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range") || request.headers.get("Range");
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Referer": "https://argon.razorshell.space/"
    };
    
    if (range) {
      headers["Range"] = range;
    }

    const res = await fetch(url, { 
      headers,
      signal: request.signal,
      dispatcher: undiciAgent
    });

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

        // Rewrite to go through our proxy
        const proxyBaseUrl = new URL(request.url).origin + "/api/proxy-stream";
        return `${proxyBaseUrl}?url=${encodeURIComponent(absUrl)}`;
      });

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegURL",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    // Pipe binary segment file stream directly (with Range support)
    const body = res.body;
    const responseHeaders = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive"
    };

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
