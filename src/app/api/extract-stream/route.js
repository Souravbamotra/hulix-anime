import { NextResponse } from "next/server";

/**
 * API route to extract direct MP4/video stream URLs from embed pages.
 * Works specifically with megaplay.su embeds which serve JWPlayer + direct MP4.
 * 
 * Query params:
 *   embedUrl - The embed page URL to extract from
 * 
 * Returns:
 *   { directUrl, thumbnailUrl, type } on success
 *   { error } on failure
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const embedUrl = searchParams.get("embedUrl");

  if (!embedUrl) {
    return NextResponse.json({ error: "Missing embedUrl parameter" }, { status: 400 });
  }

  if (embedUrl.includes("codedew.com") || embedUrl.includes("razorshell.space") || embedUrl.includes("streambeta") || embedUrl.includes("multiquality")) {
    try {
      const { extractRareAnimesStream } = await import("@/lib/scraper");
      const result = await extractRareAnimesStream(embedUrl);
      if (!result) {
        return NextResponse.json({ error: "Failed to extract RareAnimes stream" }, { status: 404 });
      }

      const origin = new URL(request.url).origin;
      const proxyBase = `${origin}/api/proxy-stream?url=`;

      const proxiedResult = {
        ...result,
        directUrl: `${proxyBase}${encodeURIComponent(result.directUrl)}`
      };

      if (result.qualities && result.qualities.length > 0) {
        proxiedResult.qualities = result.qualities.map(q => ({
          ...q,
          url: `${proxyBase}${encodeURIComponent(q.url)}`
        }));
      }

      return NextResponse.json(proxiedResult);
    } catch (err) {
      return NextResponse.json({ error: err.message || "Failed to extract stream" }, { status: 500 });
    }
  }

  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://gogoanimes.cv/",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch embed page: ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // Extract JWPlayer file URL — pattern: file: "https://...mp4..." or file: "https://...m3u8..."
    const fileMatch = html.match(/file:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
    
    // Extract thumbnail/image URL
    const imageMatch = html.match(/image:\s*["']([^"']+)["']/i);

    // Also try to find sources array pattern
    const sourcesMatch = html.match(/sources:\s*\[([\s\S]*?)\]/i);
    
    if (fileMatch) {
      const directUrl = fileMatch[1];
      const thumbnailUrl = imageMatch ? imageMatch[1] : "";
      const type = directUrl.includes(".m3u8") ? "hls" : "mp4";

      return NextResponse.json({
        directUrl,
        thumbnailUrl,
        type,
      });
    }

    // Try parsing sources array for multi-quality
    if (sourcesMatch) {
      const sourcesStr = sourcesMatch[1];
      const sources = [];
      
      // Match individual source objects: { file: "...", label: "...", type: "..." }
      const sourceRegex = /\{\s*file:\s*["']([^"']+)["'](?:.*?label:\s*["']([^"']+)["'])?(?:.*?type:\s*["']([^"']+)["'])?\s*\}/gi;
      let match;
      
      while ((match = sourceRegex.exec(sourcesStr)) !== null) {
        sources.push({
          url: match[1],
          label: match[2] || "Default",
          type: match[3] || (match[1].includes(".m3u8") ? "hls" : "mp4"),
        });
      }

      if (sources.length > 0) {
        return NextResponse.json({
          directUrl: sources[0].url,
          thumbnailUrl: imageMatch ? imageMatch[1] : "",
          type: sources[0].type,
          qualities: sources,
        });
      }
    }

    return NextResponse.json({ error: "Could not extract stream URL from embed page" }, { status: 404 });
  } catch (error) {
    console.error("[extract-stream] Error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
